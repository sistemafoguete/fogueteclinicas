import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Users, 
  DollarSign, 
  Clock, 
  Activity, 
  Calendar,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Search,
  ExternalLink
} from 'lucide-react';
import { ROLE_LABELS } from '@/hooks/useRolePermissions';
import { format, differenceInMinutes, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EmployeeReportGenerator } from '@/components/EmployeeReportGenerator';

interface EmployeeData {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  employee_role: string;
  phone?: string;
  document_cpf?: string;
  department?: string;
  salary?: number;
  is_active: boolean;
  hire_date?: string;
  // Dados calculados
  total_attendances: number;
  pending_attendances: number;
  completed_attendances: number;
  total_hours_worked: number;
  total_amount_to_receive: number;
  total_amount_paid: number;
  last_login?: string;
  total_time_logged: number;
}

interface AttendanceReport {
  id: string;
  session_date: string;
  patient_name: string;
  attendance_type: string;
  session_duration: number;
  validation_status: string;
  professional_amount: number;
  amount_charged: number;
  client_id: string;
  clients?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
}

interface TimesheetEntry {
  id: string;
  date: string;
  clock_in: string;
  clock_out: string;
  total_hours: number;
  status: string;
}

export default function EmployeeControl() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [attendances, setAttendances] = useState<AttendanceReport[]>([]);
  const [timesheet, setTimesheet] = useState<TimesheetEntry[]>([]);

  // Função para navegar para a página do paciente
  const handlePatientClick = (clientId: string) => {
    navigate(`/clients?clientId=${clientId}`);
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      loadEmployeeDetails(selectedEmployee.user_id);
    }
  }, [selectedEmployee]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      
      // Buscar todos os funcionários com seus dados
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .not('employee_role', 'is', null)
        .order('name');

      if (profilesError) throw profilesError;

      // Para cada funcionário, buscar estatísticas
      const employeesData = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Buscar relatórios de atendimento
          const { data: reports } = await supabase
            .from('attendance_reports')
            .select('validation_status, professional_amount, amount_charged')
            .eq('employee_id', profile.user_id);

          // Buscar timesheet
          const { data: timesheetData } = await supabase
            .from('employee_timesheet')
            .select('total_hours, clock_in, clock_out')
            .eq('employee_id', profile.user_id);

          const totalAttendances = reports?.length || 0;
          const completedAttendances = reports?.filter(r => r.validation_status === 'validated').length || 0;
          const pendingAttendances = reports?.filter(r => r.validation_status === 'pending_validation').length || 0;
          const totalAmountToReceive = reports?.reduce((sum, r) => sum + (r.professional_amount || 0), 0) || 0;
          const totalHoursWorked = timesheetData?.reduce((sum, t) => sum + (t.total_hours || 0), 0) || 0;

          // Calcular tempo total logado (aproximado)
          let totalTimeLogged = 0;
          timesheetData?.forEach(entry => {
            if (entry.clock_in && entry.clock_out) {
              const minutes = differenceInMinutes(
                new Date(entry.clock_out),
                new Date(entry.clock_in)
              );
              totalTimeLogged += minutes;
            }
          });

          // Buscar último login nos audit logs
          const { data: lastLoginData } = await supabase
            .from('audit_logs')
            .select('created_at')
            .eq('user_id', profile.user_id)
            .eq('action', 'login_success')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...profile,
            total_attendances: totalAttendances,
            pending_attendances: pendingAttendances,
            completed_attendances: completedAttendances,
            total_hours_worked: totalHoursWorked,
            total_amount_to_receive: totalAmountToReceive,
            total_amount_paid: 0, // TODO: implementar quando houver controle de pagamentos
            last_login: lastLoginData?.created_at,
            total_time_logged: totalTimeLogged
          } as EmployeeData;
        })
      );

      setEmployees(employeesData);
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os funcionários."
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeDetails = async (userId: string) => {
    try {
      // Buscar atendimentos detalhados com dados do cliente
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_reports')
        .select(`
          id,
          start_time,
          patient_name,
          attendance_type,
          session_duration,
          validation_status,
          professional_amount,
          amount_charged,
          client_id,
          clients:client_id (
            id,
            name,
            phone,
            email
          )
        `)
        .eq('employee_id', userId)
        .order('start_time', { ascending: false });

      if (attendanceError) throw attendanceError;

      setAttendances(attendanceData?.map(a => ({
        ...a,
        session_date: a.start_time
      })) || []);

      // Buscar timesheet detalhado
      const { data: timesheetData, error: timesheetError } = await supabase
        .from('employee_timesheet')
        .select('*')
        .eq('employee_id', userId)
        .order('date', { ascending: false });

      if (timesheetError) throw timesheetError;

      setTimesheet(timesheetData || []);
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatMinutesToHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const formatDateSafe = (dateString: string) => {
    // Adicionar 'T00:00:00' se for apenas data para evitar problemas de timezone
    const date = dateString.includes('T') ? new Date(dateString) : new Date(dateString + 'T12:00:00');
    return format(date, 'dd/MM/yyyy');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Activity className="mx-auto h-12 w-12 text-muted-foreground animate-pulse mb-4" />
          <p className="text-muted-foreground">Carregando dados dos funcionários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Controle de Funcionários</h1>
          <p className="text-muted-foreground">Gestão completa de desempenho e atividades</p>
        </div>
        <Button onClick={loadEmployees} variant="outline">
          <Activity className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Resumo Geral */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Funcionários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">
              {employees.filter(e => e.is_active).length} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atendimentos Totais</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employees.reduce((sum, e) => sum + e.total_attendances, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {employees.reduce((sum, e) => sum + e.pending_attendances, 0)} pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total a Pagar</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(employees.reduce((sum, e) => sum + e.total_amount_to_receive, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Valores pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Trabalhadas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employees.reduce((sum, e) => sum + e.total_hours_worked, 0).toFixed(1)}h
            </div>
            <p className="text-xs text-muted-foreground">
              Total registrado
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lista de Funcionários */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Funcionários</CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar funcionário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredEmployees.map((employee) => (
              <button
                key={employee.id}
                onClick={() => setSelectedEmployee(employee)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedEmployee?.id === employee.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-muted border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-sm opacity-80">
                      {ROLE_LABELS[employee.employee_role as keyof typeof ROLE_LABELS]}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={employee.is_active ? "default" : "secondary"}>
                      {employee.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    {employee.pending_attendances > 0 && (
                      <div className="text-xs mt-1 text-yellow-500">
                        {employee.pending_attendances} pendente(s)
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Detalhes do Funcionário */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {selectedEmployee ? selectedEmployee.name : 'Selecione um funcionário'}
              </CardTitle>
              {selectedEmployee && (
                <EmployeeReportGenerator 
                  employee={selectedEmployee}
                  attendances={attendances}
                  timesheet={timesheet}
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedEmployee ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="mx-auto h-12 w-12 mb-4" />
                <p>Selecione um funcionário para ver os detalhes</p>
              </div>
            ) : (
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                  <TabsTrigger value="attendances">Atendimentos</TabsTrigger>
                  <TabsTrigger value="timesheet">Ponto</TabsTrigger>
                  <TabsTrigger value="financial">Financeiro</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  {/* Informações Pessoais */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-semibold mb-2">Dados Pessoais</h4>
                      <div className="space-y-2 text-sm">
                        <div><strong>Email:</strong> {selectedEmployee.email || 'N/A'}</div>
                        <div><strong>Telefone:</strong> {selectedEmployee.phone || 'N/A'}</div>
                        <div><strong>CPF:</strong> {selectedEmployee.document_cpf || 'N/A'}</div>
                        <div><strong>Cargo:</strong> {ROLE_LABELS[selectedEmployee.employee_role as keyof typeof ROLE_LABELS]}</div>
                        <div><strong>Departamento:</strong> {selectedEmployee.department || 'N/A'}</div>
                        <div><strong>Data de Contratação:</strong> {selectedEmployee.hire_date ? format(new Date(selectedEmployee.hire_date), 'dd/MM/yyyy') : 'N/A'}</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Estatísticas</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm">Total de Atendimentos</span>
                          <Badge>{selectedEmployee.total_attendances}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm">Atendimentos Validados</span>
                          <Badge variant="default">{selectedEmployee.completed_attendances}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm">Pendentes Validação</span>
                          <Badge variant="secondary">{selectedEmployee.pending_attendances}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm">Horas Trabalhadas</span>
                          <Badge>{selectedEmployee.total_hours_worked.toFixed(1)}h</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm">Tempo Logado</span>
                          <Badge>{formatMinutesToHours(selectedEmployee.total_time_logged)}</Badge>
                        </div>
                        {selectedEmployee.last_login && (
                          <div className="flex items-center justify-between p-2 bg-muted rounded">
                            <span className="text-sm">Último Login</span>
                            <span className="text-xs">{format(new Date(selectedEmployee.last_login), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="attendances" className="space-y-6">
                  {/* Resumo de Clientes Atendidos */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Clientes Atendidos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {attendances.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="mx-auto h-8 w-8 mb-2" />
                          <p>Nenhum cliente atendido</p>
                        </div>
                      ) : (() => {
                        // Agrupar atendimentos por cliente
                        const clientsMap = new Map();
                        attendances.forEach((attendance) => {
                          const clientId = attendance.client_id;
                          if (!clientsMap.has(clientId)) {
                            clientsMap.set(clientId, {
                              id: clientId,
                              name: attendance.patient_name,
                              clientData: attendance.clients,
                              totalSessions: 0,
                              totalAmount: 0,
                              lastSession: attendance.session_date,
                              validatedSessions: 0,
                              pendingSessions: 0
                            });
                          }
                          const client = clientsMap.get(clientId);
                          client.totalSessions += 1;
                          client.totalAmount += (attendance.professional_amount || 0);
                          if (attendance.validation_status === 'validated') {
                            client.validatedSessions += 1;
                          } else if (attendance.validation_status === 'pending_validation') {
                            client.pendingSessions += 1;
                          }
                          if (new Date(attendance.session_date) > new Date(client.lastSession)) {
                            client.lastSession = attendance.session_date;
                          }
                        });
                        
                        const clients = Array.from(clientsMap.values());
                        
                        return (
                          <div className="grid gap-4 md:grid-cols-2">
                            {clients.map((client: any) => (
                              <div key={client.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex-1">
                                    <button 
                                      onClick={() => handlePatientClick(client.id)}
                                      className="font-medium text-lg text-primary hover:underline text-left flex items-center gap-1"
                                    >
                                      {client.name}
                                      <ExternalLink className="h-3 w-3" />
                                    </button>
                                    {client.clientData && (
                                      <div className="text-sm text-muted-foreground space-y-1 mt-2">
                                        {client.clientData.phone && (
                                          <p>📞 {client.clientData.phone}</p>
                                        )}
                                        {client.clientData.email && (
                                          <p>✉️ {client.clientData.email}</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="ml-2">
                                    {client.totalSessions} {client.totalSessions === 1 ? 'sessão' : 'sessões'}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div className="flex flex-col p-2 bg-muted/50 rounded">
                                    <span className="text-muted-foreground">Total recebido</span>
                                    <span className="font-medium text-green-600">{formatCurrency(client.totalAmount)}</span>
                                  </div>
                                  <div className="flex flex-col p-2 bg-muted/50 rounded">
                                    <span className="text-muted-foreground">Última sessão</span>
                                    <span className="font-medium">{format(new Date(client.lastSession), "dd/MM/yyyy")}</span>
                                  </div>
                                  <div className="flex flex-col p-2 bg-muted/50 rounded">
                                    <span className="text-muted-foreground">Validadas</span>
                                    <span className="font-medium text-green-600">{client.validatedSessions}</span>
                                  </div>
                                  <div className="flex flex-col p-2 bg-muted/50 rounded">
                                    <span className="text-muted-foreground">Pendentes</span>
                                    <span className="font-medium text-yellow-600">{client.pendingSessions}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  {/* Histórico Detalhado */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Histórico de Atendimentos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {attendances.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            <FileText className="mx-auto h-12 w-12 mb-4" />
                            <p>Nenhum atendimento registrado</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Paciente</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Duração</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Valor</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {attendances.map((attendance) => (
                                <TableRow key={attendance.id}>
                                  <TableCell>
                                    {format(new Date(attendance.session_date), 'dd/MM/yyyy')}
                                  </TableCell>
                                  <TableCell>
                                    <button
                                      onClick={() => handlePatientClick(attendance.client_id)}
                                      className="text-primary hover:underline text-left flex items-center gap-1"
                                    >
                                      {attendance.patient_name}
                                      <ExternalLink className="h-3 w-3" />
                                    </button>
                                  </TableCell>
                                  <TableCell>{attendance.attendance_type}</TableCell>
                                  <TableCell>{attendance.session_duration || 0} min</TableCell>
                                  <TableCell>
                                    <Badge variant={
                                      attendance.validation_status === 'validated' ? 'default' :
                                      attendance.validation_status === 'rejected' ? 'destructive' :
                                      'secondary'
                                    }>
                                      {attendance.validation_status === 'validated' ? 'Validado' :
                                       attendance.validation_status === 'rejected' ? 'Rejeitado' :
                                       'Pendente'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{formatCurrency(attendance.professional_amount || 0)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="timesheet">
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {timesheet.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Clock className="mx-auto h-12 w-12 mb-4" />
                        <p>Nenhum registro de ponto</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Entrada</TableHead>
                            <TableHead>Saída</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                         <TableBody>
                          {timesheet.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell>{formatDateSafe(entry.date)}</TableCell>
                              <TableCell>
                                {entry.clock_in ? format(new Date(entry.clock_in), 'HH:mm') : '-'}
                              </TableCell>
                              <TableCell>
                                {entry.clock_out ? format(new Date(entry.clock_out), 'HH:mm') : '-'}
                              </TableCell>
                              <TableCell>
                                {entry.total_hours ? formatMinutesToHours(Math.round(entry.total_hours * 60)) : '0min'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={
                                  entry.status === 'approved' ? 'default' :
                                  entry.status === 'rejected' ? 'destructive' :
                                  'secondary'
                                }>
                                  {entry.status === 'approved' ? 'Aprovado' :
                                   entry.status === 'rejected' ? 'Rejeitado' :
                                   'Pendente'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="financial">
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(selectedEmployee.total_amount_to_receive)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            De {selectedEmployee.completed_attendances} atendimentos validados
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Salário Base</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {selectedEmployee.salary ? formatCurrency(selectedEmployee.salary) : 'N/A'}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Valor mensal fixo
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Histórico de Pagamentos</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8 text-muted-foreground">
                          <DollarSign className="mx-auto h-8 w-8 mb-2" />
                          <p className="text-sm">Sistema de controle de pagamentos em desenvolvimento</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
