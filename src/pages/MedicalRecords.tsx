import { useState, useEffect } from 'react';
import { FileText, Search, User, Activity, Calendar, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useMedicalRecords } from '@/hooks/useMedicalRecords';
import { MedicalRecordTimeline } from '@/components/MedicalRecordTimeline';
import { AddMedicalRecordDialog } from '@/components/AddMedicalRecordDialog';
import { supabase } from '@/integrations/supabase/client';
import { useDebouncedValue } from '@/hooks/useDebounce';
import { useQuery } from '@tanstack/react-query';

export default function MedicalRecords() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const debouncedSearch = useDebouncedValue(searchTerm, 300);
  const { data: medicalRecords = [], isLoading: loadingRecords } = useMedicalRecords(selectedClientId);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    setUserProfile(profile);
  };

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['my-patients-medical-records', userProfile?.user_id, userProfile?.employee_role, debouncedSearch],
    queryFn: async () => {
      if (!userProfile) return [];

      const isDirector = userProfile.employee_role === 'director';
      const isCoordinator = ['coordinator_madre', 'coordinator_floresta', 'coordinator_atendimento_floresta'].includes(userProfile.employee_role);

      if (isDirector || isCoordinator) {
        let query = supabase
          .from('clients')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (debouncedSearch) {
          query = query.or(
            `name.ilike.%${debouncedSearch}%,cpf.ilike.%${debouncedSearch}%`
          );
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      }

      const { data: assignments, error: assignError } = await supabase
        .from('client_assignments')
        .select('client_id')
        .eq('employee_id', userProfile.user_id)
        .eq('is_active', true);

      if (assignError) throw assignError;
      if (!assignments || assignments.length === 0) return [];

      const clientIds = assignments.map(a => a.client_id).filter(Boolean);

      let query = supabase
        .from('clients')
        .select('*')
        .in('id', clientIds)
        .eq('is_active', true)
        .order('name');

      if (debouncedSearch) {
        query = query.or(
          `name.ilike.%${debouncedSearch}%,cpf.ilike.%${debouncedSearch}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!userProfile,
    staleTime: 60000,
  });

  const handleClientSelect = (client: any) => {
    setSelectedClient(client);
    setSelectedClientId(client.id);
  };

  const getUnitStyle = (unit: string) => {
    switch (unit?.toLowerCase()) {
      case 'madre':
        return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400';
      case 'floresta':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'atendimento_floresta':
        return 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/30 dark:text-teal-400';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <div className="container mx-auto p-2 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header moderno com gradiente */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white shadow-lg">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Prontuários</h1>
              <p className="text-blue-100 mt-1">
                Sistema completo de prontuários e histórico clínico
              </p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-white/30 text-sm px-4 py-2">
            {clients.length} pacientes
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Lista de Pacientes */}
        <Card className="lg:col-span-1 border-0 shadow-lg bg-gradient-to-b from-card to-muted/20">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-t-lg">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Meus Pacientes
            </CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar paciente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background/80 backdrop-blur-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {loadingClients ? (
                <div className="space-y-2 p-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : clients.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum paciente encontrado</p>
                </div>
              ) : (
                <div className="divide-y">
                  {clients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => handleClientSelect(client)}
                      className={`w-full p-4 text-left transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent dark:hover:from-blue-950/30 ${
                        selectedClientId === client.id 
                          ? 'bg-gradient-to-r from-blue-100 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/30 border-l-4 border-blue-500' 
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{client.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {client.cpf || 'CPF não informado'}
                          </p>
                        </div>
                        {client.unit && (
                          <Badge variant="outline" className={`ml-2 ${getUnitStyle(client.unit)}`}>
                            {client.unit}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Prontuário Detalhado */}
        <div className="lg:col-span-2">
          {!selectedClient ? (
            <Card className="h-[600px] flex items-center justify-center border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20">
              <CardContent className="text-center">
                <div className="p-6 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 inline-block mb-4">
                  <FileText className="w-16 h-16 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Selecione um Paciente</h3>
                <p className="text-muted-foreground">
                  Escolha um paciente na lista ao lado para visualizar seu prontuário
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 rounded-t-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      {selectedClient.name}
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      {selectedClient.birth_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(selectedClient.birth_date).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                      {selectedClient.cpf && <span>CPF: {selectedClient.cpf}</span>}
                    </div>
                  </div>
                  {userProfile && (
                    <AddMedicalRecordDialog 
                      clientId={selectedClient.id} 
                      employeeId={userProfile.user_id}
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <Tabs defaultValue="timeline" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-muted/50">
                    <TabsTrigger value="timeline" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
                      <Activity className="w-4 h-4 mr-2" />
                      Timeline
                    </TabsTrigger>
                    <TabsTrigger value="info" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
                      <User className="w-4 h-4 mr-2" />
                      Informações
                    </TabsTrigger>
                    <TabsTrigger value="history" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
                      <ClipboardList className="w-4 h-4 mr-2" />
                      Histórico
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="timeline" className="space-y-4 mt-6">
                    {loadingRecords ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-48 w-full" />
                        ))}
                      </div>
                    ) : (
                      <MedicalRecordTimeline records={medicalRecords} />
                    )}
                  </TabsContent>

                  <TabsContent value="info" className="space-y-4 mt-6">
                    <Card className="bg-gradient-to-br from-card to-muted/10">
                      <CardHeader>
                        <CardTitle className="text-lg">Informações do Paciente</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 rounded-lg bg-muted/30">
                            <p className="text-sm font-medium text-muted-foreground">Nome</p>
                            <p className="font-medium">{selectedClient.name}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/30">
                            <p className="text-sm font-medium text-muted-foreground">CPF</p>
                            <p className="font-medium">{selectedClient.cpf || '-'}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/30">
                            <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                            <p className="font-medium">{selectedClient.phone || '-'}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/30">
                            <p className="text-sm font-medium text-muted-foreground">Email</p>
                            <p className="font-medium">{selectedClient.email || '-'}</p>
                          </div>
                          <div className="col-span-2 p-3 rounded-lg bg-muted/30">
                            <p className="text-sm font-medium text-muted-foreground">Endereço</p>
                            <p className="font-medium">{selectedClient.address || '-'}</p>
                          </div>
                        </div>

                        {selectedClient.diagnosis && (
                          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                            <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">Diagnóstico</p>
                            <p className="text-sm">{selectedClient.diagnosis}</p>
                          </div>
                        )}

                        {selectedClient.medical_history && (
                          <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                            <p className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-1">Histórico Médico</p>
                            <p className="text-sm whitespace-pre-wrap">{selectedClient.medical_history}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="history" className="space-y-4 mt-6">
                    <div className="grid grid-cols-3 gap-4">
                      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
                        <CardContent className="p-4 text-center">
                          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{medicalRecords.length}</p>
                          <p className="text-sm text-blue-700 dark:text-blue-300">Registros</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800">
                        <CardContent className="p-4 text-center">
                          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                            {medicalRecords.filter(r => r.status === 'completed').length}
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300">Completos</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
                        <CardContent className="p-4 text-center">
                          <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                            {medicalRecords[0] ? new Date(medicalRecords[0].session_date).toLocaleDateString('pt-BR') : '-'}
                          </p>
                          <p className="text-sm text-purple-700 dark:text-purple-300">Último Atend.</p>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
