import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Combobox } from '@/components/ui/combobox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Plus, UserCheck, UserX, Shield, Minus } from 'lucide-react';

interface ClientAssignment {
  id: string;
  client_id: string;
  employee_id: string;
  assigned_by: string;
  assigned_at: string;
  is_active: boolean;
  clients?: { name: string };
  profiles?: { name: string };
  assigned_by_profile?: { name: string };
}

interface Employee {
  id: string;
  name: string;
  employee_role: string;
  user_id: string;
}

interface Client {
  id: string;
  name: string;
}

export function ClientAssignmentManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<ClientAssignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('client_assignments')
        .select(`
          *,
          clients (name),
          profiles!client_assignments_employee_id_fkey (name),
          assigned_by_profile:profiles!client_assignments_assigned_by_fkey (name)
        `)
        .order('assigned_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);

      // Load employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('profiles')
        .select('id, name, employee_role, user_id')
        .eq('is_active', true)
        .neq('employee_role', 'director') // Directors don't need assignments
        .order('name');

      if (employeesError) throw employeesError;
      setEmployees(employeesData || []);

      // Load clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (clientsError) throw clientsError;
      setClients(clientsData || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os dados.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!selectedClient || !selectedEmployee) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione um paciente e um funcionário.",
      });
      return;
    }

    try {
      // Check if assignment already exists
      const { data: existing } = await supabase
        .from('client_assignments')
        .select('id, is_active')
        .eq('client_id', selectedClient)
        .eq('employee_id', selectedEmployee)
        .single();

      if (existing) {
        if (existing.is_active) {
          toast({
            variant: "destructive",
            title: "Atribuição já existe",
            description: "Este funcionário já está atribuído a este paciente.",
          });
          return;
        } else {
          // Reactivate existing assignment
          const { error } = await supabase
            .from('client_assignments')
            .update({ is_active: true, assigned_by: user?.id })
            .eq('id', existing.id);

          if (error) throw error;
        }
      } else {
        // Create new assignment
        const { error } = await supabase
          .from('client_assignments')
          .insert({
            client_id: selectedClient,
            employee_id: selectedEmployee,
            assigned_by: user?.id,
            is_active: true
          });

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: "Atribuição criada com sucesso!",
      });

      setSelectedClient('');
      setSelectedEmployee('');
      setIsDialogOpen(false);
      loadData();

    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível criar a atribuição.",
      });
    }
  };

  const handleToggleAssignment = async (assignmentId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('client_assignments')
        .update({ 
          is_active: !currentStatus,
          assigned_by: user?.id
        })
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Atribuição ${!currentStatus ? 'ativada' : 'desativada'} com sucesso!`,
      });

      loadData();
    } catch (error) {
      console.error('Error toggling assignment:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível alterar a atribuição.",
      });
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      staff: 'Funcionário',
      psychologist: 'Psicólogo(a)',
      psychopedagogue: 'Psicopedagogo(a)',
      speech_therapist: 'Fonoaudiólogo(a)',
      nutritionist: 'Nutricionista',
      physiotherapist: 'Fisioterapeuta',
      musictherapist: 'Musicoterapeuta',
      coordinator_madre: 'Coordenador(a) Madre',
      coordinator_floresta: 'Coordenador(a) Floresta'
    };
    return labels[role] || role;
  };

  // Get available clients (not yet assigned to selected employee)
  const availableClients = clients.filter(client => {
    if (!selectedEmployee) return true;
    return !assignments.some(a => 
      a.client_id === client.id && 
      a.employee_id === selectedEmployee && 
      a.is_active
    );
  });

  // Get available employees (not yet assigned to selected client)
  const availableEmployees = employees.filter(employee => {
    if (!selectedClient) return true;
    return !assignments.some(a => 
      a.client_id === selectedClient && 
      a.employee_id === employee.user_id && 
      a.is_active
    );
  });

  return (
    <Card className="shadow-professional">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Gerenciar Atribuições de Pacientes
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Atribuição
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Atribuição</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Paciente:</label>
                <Combobox
                  options={availableClients.map((client) => ({
                    value: client.id,
                    label: client.name
                  }))}
                  value={selectedClient}
                  onValueChange={setSelectedClient}
                  placeholder="Buscar paciente..."
                  searchPlaceholder="Digite o nome do paciente..."
                  emptyMessage="Nenhum paciente encontrado."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Funcionário:</label>
                <Combobox
                  options={availableEmployees.map((employee) => ({
                    value: employee.user_id,
                    label: `${employee.name} - ${getRoleLabel(employee.employee_role)}`
                  }))}
                  value={selectedEmployee}
                  onValueChange={setSelectedEmployee}
                  placeholder="Buscar funcionário..."
                  searchPlaceholder="Digite o nome do funcionário..."
                  emptyMessage="Nenhum funcionário encontrado."
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateAssignment}>
                  Criar Atribuição
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Funcionário Atribuído</TableHead>
                <TableHead>Atribuído Por</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : assignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Nenhuma atribuição encontrada
                  </TableCell>
                </TableRow>
              ) : (
                assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      {assignment.clients?.name}
                    </TableCell>
                    <TableCell>{assignment.profiles?.name}</TableCell>
                    <TableCell>{assignment.assigned_by_profile?.name}</TableCell>
                    <TableCell>
                      {new Date(assignment.assigned_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={assignment.is_active ? "default" : "secondary"}>
                        {assignment.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {assignment.is_active ? (
                          <>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleToggleAssignment(assignment.id, assignment.is_active)}
                              className="gap-1 px-2"
                              title="Desvincular profissional - Remove acesso ao cliente"
                            >
                              <Minus className="h-3 w-3" />
                              -
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleAssignment(assignment.id, assignment.is_active)}
                              className="gap-1"
                            >
                              <UserX className="h-3 w-3" />
                              Desvincular
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleToggleAssignment(assignment.id, assignment.is_active)}
                            className="gap-1"
                          >
                            <UserCheck className="h-3 w-3" />
                            Vincular
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">
            ℹ️ Informação de Segurança
          </h4>
          <p className="text-sm text-blue-800">
            <strong>Política de Segurança Ativa:</strong> Funcionários só podem visualizar e gerenciar clientes que foram especificamente atribuídos a eles. Diretores e coordenadores mantêm acesso total para supervisão.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}