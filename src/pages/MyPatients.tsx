import React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { 
  Heart, 
  Search, 
  Calendar as CalendarIcon, 
  Phone, 
  MapPin, 
  User, 
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, addDays, subDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ClientDetailsView from '@/components/ClientDetailsView';

interface Client {
  id: string;
  name: string;
  birth_date?: string;
  phone?: string;
  address?: string;
  unit?: string;
  responsible_name?: string;
  responsible_phone?: string;
  is_active: boolean;
  last_session_date?: string;
  created_at: string;
}

interface Schedule {
  id: string;
  client_id: string;
  employee_id: string;
  start_time: string;
  end_time: string;
  title: string;
  status: string;
  notes?: string;
  clients?: { name: string };
}

const MyPatients: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const permissions = useRolePermissions();
  const [clients, setClients] = useState<Client[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));

  useEffect(() => {
    // Permitir acesso para todos os usuários autenticados
    if (!user) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você precisa estar logado para ver esta página.",
      });
      return;
    }

    loadMyPatients();
    loadMySchedules();
  }, [user, selectedDate]);

  const loadMySchedules = async () => {
    if (!user) return;

    try {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

      let query = supabase
        .from('schedules')
        .select(`
          id,
          client_id,
          employee_id,
          start_time,
          end_time,
          title,
          status,
          notes,
          clients (name)
        `)
        .gte('start_time', weekStart.toISOString())
        .lte('start_time', weekEnd.toISOString())
        .order('start_time');

      // Para todos os usuários, filtrar apenas agendamentos dos clientes vinculados
      const { data: assignedClients } = await supabase
        .from('client_assignments')
        .select('client_id')
        .eq('employee_id', user.id)
        .eq('is_active', true);

      if (!assignedClients || assignedClients.length === 0) {
        setSchedules([]);
        return;
      }

      const clientIds = assignedClients.map(a => a.client_id);
      
      query = query.in('client_id', clientIds);

      const { data, error } = await query;

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error loading schedules:', error);
    }
  };

  const loadMyPatients = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Para todos os usuários, apenas clientes vinculados através de client_assignments
      const { data, error } = await supabase
        .from('client_assignments')
        .select(`
          client_id,
          clients (
            id,
            name,
            birth_date,
            phone,
            address,
            unit,
            responsible_name,
            responsible_phone,
            is_active,
            last_session_date,
            created_at
          )
        `)
        .eq('employee_id', user.id)
        .eq('is_active', true)
        .eq('clients.is_active', true);

      if (error) throw error;
      
      // Extrair os dados dos clientes
      const clientsData = (data || [])
        .filter(assignment => assignment.clients)
        .map(assignment => assignment.clients)
        .filter(Boolean) as Client[];

      setClients(clientsData);
    } catch (error) {
      console.error('Error loading patients:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar pacientes",
        description: "Não foi possível carregar a lista de pacientes.",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const daysSinceLastSession = (dateString?: string) => {
    if (!dateString) return null;
    const today = new Date();
    const lastSession = new Date(dateString);
    const diffTime = Math.abs(today.getTime() - lastSession.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'default';
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      case 'no_show': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Agendado';
      case 'confirmed': return 'Confirmado';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      case 'no_show': return 'Faltou';
      default: return status;
    }
  };

  const getDaySchedules = (date: Date) => {
    return schedules.filter(schedule => 
      isSameDay(new Date(schedule.start_time), date)
    );
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = direction === 'prev' 
      ? subDays(currentWeekStart, 7)
      : addDays(currentWeekStart, 7);
    setCurrentWeekStart(newWeekStart);
    setSelectedDate(newWeekStart);
  };

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(currentWeekStart, i));
    }
    return days;
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.responsible_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="text-lg">Carregando pacientes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {selectedClient ? (
        <div>
          <Button 
            variant="outline" 
            onClick={() => setSelectedClient(null)}
            className="mb-4"
          >
            ← Voltar para Lista
          </Button>
          <ClientDetailsView 
            client={selectedClient} 
            onEdit={() => {}} 
            onRefresh={() => loadMyPatients()}
          />
        </div>
      ) : (
        <>
          {/* Cabeçalho */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-fade-in">
            <div className="relative">
              <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 rounded-full" />
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent">
                Meus Pacientes
              </h1>
              <p className="text-muted-foreground mt-2">
                Gerencie seus pacientes e visualize a agenda da semana
              </p>
            </div>
            <Badge className="text-lg px-6 py-3 w-fit bg-gradient-to-r from-green-500/10 to-green-600/10 text-green-700 dark:text-green-400 border-green-500/20 hover:from-green-500/20 hover:to-green-600/20 transition-all duration-300">
              <Heart className="h-4 w-4 mr-2" />
              {filteredClients.length} paciente{filteredClients.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Agenda Semanal */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-blue-500/5 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent pointer-events-none" />
            <CardHeader className="relative border-b border-gradient-to-r from-transparent via-blue-500/20 to-transparent">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg">
                    <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent font-bold">
                    Agenda da Semana
                  </span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigateWeek('prev')}
                    className="hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500/50 transition-all duration-300"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-semibold min-w-[200px] text-center bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                    {format(currentWeekStart, "dd/MM", { locale: ptBR })} - {format(addDays(currentWeekStart, 6), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigateWeek('next')}
                    className="hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500/50 transition-all duration-300"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {getWeekDays().map((day) => {
                  const daySchedules = getDaySchedules(day);
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <div 
                      key={day.toDateString()} 
                      className={`group p-4 border rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                        isToday 
                          ? 'bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/40 shadow-md' 
                          : 'bg-gradient-to-br from-background to-muted/20 hover:border-blue-500/20'
                      }`}
                    >
                      <div className="text-center mb-3">
                        <div className={`font-semibold text-sm uppercase tracking-wider ${
                          isToday ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
                        }`}>
                          {format(day, 'EEE', { locale: ptBR })}
                        </div>
                        <div className={`text-3xl font-extrabold ${
                          isToday 
                            ? 'bg-gradient-to-br from-blue-600 to-blue-500 bg-clip-text text-transparent' 
                            : 'text-foreground'
                        }`}>
                          {format(day, 'dd', { locale: ptBR })}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {daySchedules.length === 0 ? (
                          <div className="text-xs text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                            Nenhum agendamento
                          </div>
                        ) : (
                          daySchedules.map((schedule) => (
                            <div 
                              key={schedule.id} 
                              className="group/schedule p-3 bg-gradient-to-br from-background to-muted/30 border rounded-lg text-xs hover:shadow-md hover:border-blue-500/30 transition-all duration-200"
                            >
                              <div className="font-bold text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(schedule.start_time), 'HH:mm', { locale: ptBR })}
                              </div>
                              <div className="text-foreground truncate font-medium mt-1">
                                {schedule.clients?.name || 'Cliente N/A'}
                              </div>
                              <Badge 
                                variant={getStatusColor(schedule.status)} 
                                className="text-xs mt-2"
                              >
                                {getStatusLabel(schedule.status)}
                              </Badge>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Barra de Pesquisa */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-blue-500/5">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-500 h-5 w-5" />
                <Input
                  placeholder="🔍 Pesquisar por nome do paciente ou responsável..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 bg-background/50 border-blue-500/20 focus:border-blue-500 transition-all duration-300"
                />
              </div>
            </CardContent>
          </Card>

          {/* Lista de Pacientes */}
          {filteredClients.length === 0 ? (
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-muted/20">
              <CardContent className="pt-8 pb-8">
                <div className="text-center">
                  <div className="inline-block p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-full mb-4">
                    <Heart className="h-16 w-16 text-blue-500" />
                  </div>
                  <h3 className="mt-4 text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                    {searchTerm ? 'Nenhum paciente encontrado' : 'Nenhum paciente vinculado'}
                  </h3>
                  <p className="text-muted-foreground mt-2">
                    {searchTerm 
                      ? 'Tente ajustar os termos de pesquisa.'
                      : 'Entre em contato com a coordenação para vincular pacientes.'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredClients.map((client, index) => {
                const age = calculateAge(client.birth_date);
                const daysSince = daysSinceLastSession(client.last_session_date);
                const isMinor = age !== null && age < 18;
                
                // Configuração de cores por unidade
                const unitConfig = {
                  madre: { 
                    gradient: 'from-blue-500 to-blue-600', 
                    bg: 'bg-blue-50 dark:bg-blue-950/30',
                    text: 'text-blue-700 dark:text-blue-300',
                    icon: '🏥'
                  },
                  floresta: { 
                    gradient: 'from-emerald-500 to-emerald-600', 
                    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
                    text: 'text-emerald-700 dark:text-emerald-300',
                    icon: '🌳'
                  },
                  atendimento_floresta: { 
                    gradient: 'from-teal-500 to-teal-600', 
                    bg: 'bg-teal-50 dark:bg-teal-950/30',
                    text: 'text-teal-700 dark:text-teal-300',
                    icon: '🌿'
                  }
                };
                const config = unitConfig[client.unit as keyof typeof unitConfig] || unitConfig.madre;

                return (
                  <Card 
                    key={client.id} 
                    className="group relative overflow-hidden border shadow-sm hover:shadow-lg transition-shadow duration-200 bg-card"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Header com gradiente da unidade */}
                    <div className={`h-1.5 bg-gradient-to-r ${config.gradient}`} />
                    
                    <CardHeader className="pb-3 pt-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg font-semibold text-foreground truncate">
                            {client.name}
                          </CardTitle>
                          {age !== null && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {age} anos {isMinor && <span className="text-amber-600 dark:text-amber-400">(Menor)</span>}
                            </p>
                          )}
                        </div>
                        <Badge 
                          variant="outline"
                          className={`shrink-0 text-xs font-medium ${config.bg} ${config.text} border-0`}
                        >
                          {config.icon} {client.unit === 'madre' ? 'Madre' : 
                              client.unit === 'floresta' ? 'Floresta' :
                              client.unit === 'atendimento_floresta' ? 'Atend.' :
                              'N/A'}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-2.5 pb-4">
                      {/* Telefone */}
                      {(client.phone || client.responsible_phone) && (
                        <div className="flex items-center gap-2.5 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-foreground truncate">
                            {isMinor && client.responsible_phone 
                              ? client.responsible_phone 
                              : client.phone || 'Não informado'}
                          </span>
                        </div>
                      )}

                      {/* Responsável */}
                      {isMinor && client.responsible_name && (
                        <div className="flex items-center gap-2.5 text-sm">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-foreground truncate">
                            Resp.: {client.responsible_name}
                          </span>
                        </div>
                      )}

                      {/* Endereço */}
                      {client.address && (
                        <div className="flex items-start gap-2.5 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <span className="text-muted-foreground line-clamp-1">
                            {client.address}
                          </span>
                        </div>
                      )}

                      {/* Última sessão */}
                      {client.last_session_date && daysSince !== null && (
                        <div className="flex items-center gap-2.5 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className={daysSince > 30 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}>
                            Última sessão: {daysSince} dia{daysSince !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}

                      {/* Botões */}
                      <div className="flex gap-2 pt-3 border-t border-border/50">
                        <Button 
                          size="sm" 
                          onClick={() => setSelectedClient(client)}
                          className="flex-1"
                        >
                          Ver Detalhes
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            window.location.href = `/schedule?client=${client.id}`;
                          }}
                        >
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyPatients;