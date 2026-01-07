import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar as CalendarIcon, Clock, User, Edit, CheckCircle, XCircle, ArrowRightLeft, Filter, Users, Stethoscope, Search, X, Trash2, CalendarDays, LayoutList, UserCheck, ClipboardList, AlertCircle } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ScheduleAlerts } from '@/components/ScheduleAlerts';
import { CancelAppointmentDialog } from '@/components/CancelAppointmentDialog';
import { DeleteAppointmentDialog } from '@/components/DeleteAppointmentDialog';
import CompleteAttendanceDialog from '@/components/CompleteAttendanceDialog';
import { PatientCommandAutocomplete } from '@/components/PatientCommandAutocomplete';
import { ProfessionalCommandAutocomplete } from '@/components/ProfessionalCommandAutocomplete';
import PatientPresenceButton from '@/components/PatientPresenceButton';
import PatientArrivedNotification from '@/components/PatientArrivedNotification';
import { ScheduleCard } from '@/components/ScheduleCard';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useEmployees } from '@/hooks/useEmployees';
import { useClients } from '@/hooks/useClients';
import { useSchedules, useCreateSchedule, useUpdateSchedule } from '@/hooks/useSchedules';
import { PageHeader } from '@/components/ui/page-header';
import { StatsCard } from '@/components/ui/stats-card';

interface Schedule {
  id: string;
  client_id: string;
  employee_id: string;
  start_time: string;
  end_time: string;
  title: string;
  status: string;
  notes?: string;
  unit?: string;
  patient_arrived?: boolean;
  arrived_at?: string;
  arrived_confirmed_by?: string;
  clients?: { name: string };
  profiles?: { name: string };
}

export default function Schedule() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedScheduleForAction, setSelectedScheduleForAction] = useState<Schedule | null>(null);
  const { toast } = useToast();

  // Filtros
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterUnit, setFilterUnit] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [filterTimeStart, setFilterTimeStart] = useState('');
  const [filterTimeEnd, setFilterTimeEnd] = useState('');

  // React Query hooks
  const { data: userProfile, isLoading: loadingProfile } = useUserProfile(user?.id);
  const { data: employees = [], isLoading: loadingEmployees } = useEmployees(userProfile);
  const { data: clients = [], isLoading: loadingClients } = useClients({ isActive: true });
  const { data: schedules = [], isLoading: loadingSchedules, refetch: refetchSchedules } = useSchedules(
    selectedDate, 
    userProfile,
    {
      employeeId: filterEmployee !== 'all' ? filterEmployee : undefined,
      viewMode: viewMode,
    }
  );
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();

  const userRole = userProfile?.employee_role;
  const isAdmin = userRole === 'director' || 
                  userRole === 'coordinator_madre' || 
                  userRole === 'coordinator_floresta' ||
                  userRole === 'coordinator_atendimento_floresta' ||
                  userRole === 'receptionist';
  
  // Verificar se pode cancelar agendamentos
  const canCancelSchedules = userRole === 'director' || 
                             userRole === 'coordinator_madre' || 
                             userRole === 'coordinator_floresta' ||
                             userRole === 'coordinator_atendimento_floresta' ||
                             userRole === 'receptionist';

  // Verificar se pode excluir agendamentos (apenas coordenadores e diretor, não recepcionista)
  const canDeleteSchedules = userRole === 'director' || 
                             userRole === 'coordinator_madre' || 
                             userRole === 'coordinator_floresta' ||
                             userRole === 'coordinator_atendimento_floresta';

  const [newAppointment, setNewAppointment] = useState({
    client_id: '',
    employee_id: '',
    title: 'Consulta',
    start_time: '',
    end_time: '',
    notes: '',
    unit: 'madre',
    sessionCount: 1
  });

  // Auto-definir a unidade baseada no funcionário logado
  useEffect(() => {
    if (userProfile) {
      // Priorizar a unidade definida no perfil do usuário
      let defaultUnit = userProfile.unit || 'madre';
      
      // Fallback baseado no cargo se não houver unidade definida
      if (!userProfile.unit) {
        if (userProfile.employee_role === 'coordinator_floresta') {
          defaultUnit = 'floresta';
        } else if (userProfile.employee_role === 'coordinator_madre') {
          defaultUnit = 'madre';
        } else if (userProfile.employee_role === 'coordinator_atendimento_floresta') {
          defaultUnit = 'atendimento_floresta';
        }
      }
      
      setNewAppointment(prev => ({
        ...prev,
        unit: defaultUnit
      }));
    }
  }, [userProfile]);

  useEffect(() => {
    // Verificar se há parâmetros na URL para pré-preencher o formulário
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('client_id') || urlParams.get('client');
    
    if (clientId) {
      setNewAppointment(prev => ({
        ...prev,
        client_id: clientId
      }));
      setIsDialogOpen(true);
    }
  }, []);

  // Auto-selecionar o profissional para usuários não-administrativos
  useEffect(() => {
    if (userProfile && !isAdmin) {
      setNewAppointment(prev => ({
        ...prev,
        employee_id: userProfile.id
      }));
    }
  }, [userProfile, isAdmin]);

  // Loading state
  const loading = loadingProfile || loadingEmployees || loadingClients || loadingSchedules;

  // Função para verificar sobreposição de horários
  const checkScheduleConflict = async (employeeId: string, startTime: string, endTime: string, excludeId?: string) => {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select('id, start_time, end_time')
        .eq('employee_id', employeeId)
        .in('status', ['scheduled', 'confirmed'])
        .gte('start_time', startTime.split('T')[0]) // Same day
        .lt('start_time', new Date(new Date(startTime).getTime() + 24*60*60*1000).toISOString().split('T')[0] + 'T23:59:59');
      
      if (error) throw error;
      
      return data?.some(schedule => {
        if (excludeId && schedule.id === excludeId) return false;
        
        const existingStart = new Date(schedule.start_time).getTime();
        const existingEnd = new Date(schedule.end_time).getTime();
        const newStart = new Date(startTime).getTime();
        const newEnd = new Date(endTime).getTime();
        
        // Verificar sobreposição
        return (newStart < existingEnd && newEnd > existingStart);
      }) || false;
    } catch (error) {
      console.error('Error checking schedule conflict:', error);
      return false;
    }
  };

  const handleCreateAppointment = async () => {
    try {
      const convertToISOString = (dateTimeLocal: string) => {
        if (!dateTimeLocal) return '';
        const date = new Date(dateTimeLocal);
        return date.toISOString();
      };

      const appointmentData = {
        client_id: newAppointment.client_id,
        employee_id: newAppointment.employee_id,
        title: newAppointment.title,
        start_time: convertToISOString(newAppointment.start_time),
        end_time: convertToISOString(newAppointment.end_time),
        notes: newAppointment.notes,
        unit: newAppointment.unit,
        created_by: user?.id
      };

      if (editingSchedule) {
        const hasConflict = await checkScheduleConflict(
          appointmentData.employee_id,
          appointmentData.start_time,
          appointmentData.end_time,
          editingSchedule.id
        );
        
        if (hasConflict) {
          toast({
            variant: "destructive",
            title: "Conflito de Horário",
            description: "O profissional já possui um agendamento neste horário.",
          });
          return;
        }

        await updateSchedule.mutateAsync({
          id: editingSchedule.id,
          data: appointmentData
        });
        
        toast({
          title: "Sucesso",
          description: "Agendamento atualizado com sucesso!",
        });
      } else {
        const sessionCount = newAppointment.sessionCount || 1;
        const appointmentsToCreate = [];
        let conflictFound = false;
        
        for (let i = 0; i < sessionCount; i++) {
          const sessionDate = new Date(appointmentData.start_time);
          const sessionEndDate = new Date(appointmentData.end_time);
          
          sessionDate.setDate(sessionDate.getDate() + (i * 7));
          sessionEndDate.setDate(sessionEndDate.getDate() + (i * 7));
          
          const sessionStartTime = sessionDate.toISOString();
          const sessionEndTime = sessionEndDate.toISOString();
          
          const hasConflict = await checkScheduleConflict(
            appointmentData.employee_id,
            sessionStartTime,
            sessionEndTime
          );
          
          if (hasConflict) {
            toast({
              variant: "destructive",
              title: "Conflito de Horário",
              description: `Conflito encontrado na sessão ${i + 1} (${format(sessionDate, 'dd/MM/yyyy HH:mm', { locale: ptBR })}). O profissional já possui um agendamento neste horário.`,
            });
            conflictFound = true;
            break;
          }
          
          appointmentsToCreate.push({
            ...appointmentData,
            start_time: sessionStartTime,
            end_time: sessionEndTime,
            status: 'scheduled',
            notes: sessionCount > 1 
              ? `${appointmentData.notes} (Sessão ${i + 1} de ${sessionCount})` 
              : appointmentData.notes
          });
        }
        
        if (conflictFound) return;

        const { error } = await supabase
          .from('schedules')
          .insert(appointmentsToCreate);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: sessionCount > 1 
            ? `${sessionCount} sessões criadas com sucesso!`
            : "Agendamento criado com sucesso!",
        });
      }
      
      setIsDialogOpen(false);
      setEditingSchedule(null);
      setNewAppointment({
        client_id: '',
        employee_id: '',
        title: 'Consulta',
        start_time: '',
        end_time: '',
        notes: '',
        unit: 'madre',
        sessionCount: 1
      });
      refetchSchedules();
    } catch (error) {
      console.error('Error saving appointment:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao salvar agendamento. Tente novamente.",
      });
    }
  };

  const formatDateTimeLocal = (isoString: string) => {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setNewAppointment({
      client_id: schedule.client_id,
      employee_id: schedule.employee_id,
      title: schedule.title,
      start_time: formatDateTimeLocal(schedule.start_time),
      end_time: formatDateTimeLocal(schedule.end_time),
      notes: schedule.notes || '',
      unit: schedule.unit || 'madre',
      sessionCount: 1
    });
    setIsDialogOpen(true);
  };

  const handleRedirect = async (scheduleId: string, newEmployeeId: string) => {
    try {
      const { error } = await supabase
        .from('schedules')
        .update({ employee_id: newEmployeeId })
        .eq('id', scheduleId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Agendamento redirecionado com sucesso!",
      });
      
      refetchSchedules();
    } catch (error) {
      console.error('Error redirecting appointment:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao redirecionar agendamento.",
      });
    }
  };

  const handleCancelAppointment = async (scheduleId: string, reason?: string, category?: string) => {
    try {
      const cancelNote = category 
        ? `[${category}] ${reason || 'Cancelado'}` 
        : (reason ? `Cancelado: ${reason}` : 'Cancelado');
        
      const { error } = await supabase
        .from('schedules')
        .update({ 
          status: 'cancelled',
          notes: cancelNote
        })
        .eq('id', scheduleId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Agendamento cancelado!",
      });
      
      refetchSchedules();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao cancelar agendamento.",
      });
    }
  };

  // Cancelar múltiplos agendamentos
  const handleCancelMultipleAppointments = async (scheduleIds: string[], reason: string, category: string) => {
    try {
      const cancelNote = `[${category}] ${reason}`;
      
      const { error } = await supabase
        .from('schedules')
        .update({ 
          status: 'cancelled',
          notes: cancelNote
        })
        .in('id', scheduleIds);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `${scheduleIds.length} agendamento(s) cancelado(s)!`,
      });
      
      refetchSchedules();
    } catch (error) {
      console.error('Error cancelling multiple appointments:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao cancelar agendamentos.",
      });
    }
  };

  // Excluir um agendamento
  const handleDeleteAppointment = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Atendimento excluído!",
      });
      
      refetchSchedules();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao excluir atendimento.",
      });
    }
  };

  // Excluir múltiplos agendamentos
  const handleDeleteMultipleAppointments = async (scheduleIds: string[]) => {
    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .in('id', scheduleIds);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `${scheduleIds.length} atendimento(s) excluído(s)!`,
      });
      
      refetchSchedules();
    } catch (error) {
      console.error('Error deleting multiple appointments:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao excluir atendimentos.",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon?: any; className?: string }> = {
      'scheduled': { text: 'Agendado', variant: 'default', icon: CalendarIcon },
      'confirmed': { text: 'Confirmado', variant: 'secondary', icon: CheckCircle },
      'completed': { text: '✓ Concluído', variant: 'outline', icon: CheckCircle, className: 'border-green-500 text-green-700 bg-green-50 font-semibold' },
      'pending_validation': { text: '⏳ Aguardando Validação', variant: 'outline', icon: Clock, className: 'border-amber-500 text-amber-700 bg-amber-50 font-semibold' },
      'cancelled': { text: 'Cancelado', variant: 'destructive', icon: XCircle }
    };
    
    return statusMap[status] || { text: 'Desconhecido', variant: 'outline' as const };
  };

  // Calcular datas para visualização semanal
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Segunda-feira
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Filtrar agendamentos
  const filteredSchedules = schedules.filter(schedule => {
    // Filtro de funcionário
    if (filterEmployee !== 'all' && schedule.employee_id !== filterEmployee) {
      return false;
    }

    // Filtro de unidade
    if (filterUnit !== 'all' && schedule.unit !== filterUnit) {
      return false;
    }

    // Filtro de pesquisa universal (busca em todos os campos)
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      const patientName = schedule.clients?.name?.toLowerCase() || '';
      const professionalName = employees.find(emp => emp.user_id === schedule.employee_id)?.name?.toLowerCase() || '';
      const title = schedule.title?.toLowerCase() || '';
      const notes = schedule.notes?.toLowerCase() || '';
      const unit = schedule.unit?.toLowerCase() || '';
      const startTime = format(new Date(schedule.start_time), 'HH:mm');
      const endTime = format(new Date(schedule.end_time), 'HH:mm');
      const dateFormatted = format(new Date(schedule.start_time), 'dd/MM/yyyy');
      const dayName = format(new Date(schedule.start_time), 'EEEE', { locale: ptBR }).toLowerCase();
      const status = schedule.status?.toLowerCase() || '';
      
      // Buscar em todos os campos
      const allFields = [
        patientName,
        professionalName,
        title,
        notes,
        unit,
        startTime,
        endTime,
        dateFormatted,
        dayName,
        status
      ].join(' ');
      
      if (!allFields.includes(searchLower)) {
        return false;
      }
    }

    // Filtro de horário
    if (filterTimeStart || filterTimeEnd) {
      const scheduleTime = format(new Date(schedule.start_time), 'HH:mm');
      
      if (filterTimeStart && scheduleTime < filterTimeStart) {
        return false;
      }
      
      if (filterTimeEnd && scheduleTime > filterTimeEnd) {
        return false;
      }
    }

    return true;
  });

  // Separar agendamentos por modo de visualização
  const todaySchedules = viewMode === 'day' 
    ? filteredSchedules 
    : filteredSchedules;

  // Agrupar agendamentos por dia para visualização semanal
  const schedulesByDay = weekDays.map(day => ({
    date: day,
    schedules: filteredSchedules.filter(schedule => 
      isSameDay(new Date(schedule.start_time), day)
    )
  }));

  console.log('Today schedules:', todaySchedules); // Debug log
  console.log('User can see patient presence buttons:', userProfile?.employee_role === 'receptionist'); // Debug log

  // Estatísticas do dia
  const dayStats = {
    total: filteredSchedules.length,
    confirmed: filteredSchedules.filter(s => s.status === 'confirmed' || s.patient_arrived).length,
    pending: filteredSchedules.filter(s => s.status === 'scheduled' && !s.patient_arrived).length,
    completed: filteredSchedules.filter(s => s.status === 'completed').length,
  };

  return (
    <div className="container mx-auto p-2 sm:p-4 space-y-4 sm:space-y-6 animate-fade-in">
      <PatientArrivedNotification />
      <ScheduleAlerts />
      
      {/* Header */}
      <PageHeader
        title="Agenda de Atendimentos"
        description="Gerencie seus compromissos e visualize os horários disponíveis"
        icon={<CalendarIcon className="h-6 w-6" />}
        iconColor="blue"
        actions={
          <Button 
            className="gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 border-0 shadow-lg" 
            onClick={() => {
              setEditingSchedule(null);
              const defaultEmployeeId = !isAdmin && employees.length === 1 ? employees[0].user_id : '';
              setNewAppointment({
                client_id: '',
                employee_id: defaultEmployeeId,
                title: 'Consulta',
                start_time: '',
                end_time: '',
                notes: '',
                unit: userProfile?.unit || 'madre',
                sessionCount: 1
              });
              setIsDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Novo Agendamento
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard
          title="Total do Dia"
          value={dayStats.total}
          icon={<ClipboardList className="h-5 w-5" />}
          variant="blue"
        />
        <StatsCard
          title="Presentes"
          value={dayStats.confirmed}
          icon={<UserCheck className="h-5 w-5" />}
          variant="green"
        />
        <StatsCard
          title="Aguardando"
          value={dayStats.pending}
          icon={<Clock className="h-5 w-5" />}
          variant="orange"
        />
        <StatsCard
          title="Concluídos"
          value={dayStats.completed}
          icon={<CheckCircle className="h-5 w-5" />}
          variant="default"
        />
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar esquerda com calendário e controles */}
        <div className="lg:w-72">
          <div className="space-y-4">
            {/* Calendário */}
            <Card className="border shadow-sm">
              <CardContent className="p-3">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={ptBR}
                  className="rounded-lg w-full"
                />
              </CardContent>
            </Card>

            {/* Filtros para Administradores */}
            {isAdmin && (
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    Filtros
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">Profissional</Label>
                    <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                      <SelectTrigger className="h-9 mt-1">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {employees.map((emp) => (
                          <SelectItem key={emp.user_id} value={emp.user_id}>
                            {emp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {userRole === 'director' && (
                    <div>
                      <Label className="text-xs">Unidade</Label>
                      <Select value={filterUnit} onValueChange={setFilterUnit}>
                        <SelectTrigger className="h-9 mt-1">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="madre">MADRE</SelectItem>
                          <SelectItem value="floresta">Floresta</SelectItem>
                          <SelectItem value="atendimento_floresta">Atend. Floresta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="flex-1">
          <div className="space-y-4">
            {/* Barra de pesquisa e visualização */}
            <Card className="border shadow-sm">
              <CardContent className="py-3 px-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Pesquisa */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar paciente, profissional, horário..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className="pl-9 pr-9 h-9"
                    />
                    {searchText && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setSearchText('')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Toggle Dia/Semana */}
                  <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'day' | 'week')}>
                    <ToggleGroupItem value="day" aria-label="Dia" className="gap-1.5 h-9 px-3">
                      <LayoutList className="h-4 w-4" />
                      <span className="text-sm">Dia</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="week" aria-label="Semana" className="gap-1.5 h-9 px-3">
                      <CalendarDays className="h-4 w-4" />
                      <span className="text-sm">Semana</span>
                    </ToggleGroupItem>
                  </ToggleGroup>

                  {/* Filtro de horário */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={filterTimeStart}
                      onChange={(e) => setFilterTimeStart(e.target.value)}
                      className="w-24 h-9"
                    />
                    <span className="text-muted-foreground text-sm">-</span>
                    <Input
                      type="time"
                      value={filterTimeEnd}
                      onChange={(e) => setFilterTimeEnd(e.target.value)}
                      className="w-24 h-9"
                    />
                    {(filterTimeStart || filterTimeEnd) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setFilterTimeStart(''); setFilterTimeEnd(''); }}
                        className="h-9 w-9 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Filtros ativos */}
                {(searchText || filterTimeStart || filterTimeEnd || filterEmployee !== 'all' || filterUnit !== 'all') && (
                  <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t">
                    <span className="text-xs text-muted-foreground">Filtros:</span>
                    {searchText && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        "{searchText}"
                        <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchText('')} />
                      </Badge>
                    )}
                    {filterEmployee !== 'all' && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        {employees.find(e => e.user_id === filterEmployee)?.name}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterEmployee('all')} />
                      </Badge>
                    )}
                    {filterUnit !== 'all' && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        {filterUnit === 'madre' ? 'MADRE' : filterUnit === 'floresta' ? 'Floresta' : 'Atend. Floresta'}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterUnit('all')} />
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lista de Agendamentos */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    {viewMode === 'day' ? 'Agenda do Dia' : 'Agenda da Semana'}
                    <span className="text-sm font-normal text-muted-foreground">
                      - {viewMode === 'day' 
                        ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR })
                        : `${format(weekStart, "dd/MM", { locale: ptBR })} a ${format(addDays(weekStart, 6), "dd/MM", { locale: ptBR })}`
                      }
                    </span>
                  </CardTitle>
                  <Badge variant="outline">{filteredSchedules.length} agendamento(s)</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="border-0 shadow-lg">
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Skeleton className="h-10 w-32" />
                              <Skeleton className="h-6 w-20" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <Skeleton className="h-16 w-full" />
                              <Skeleton className="h-16 w-full" />
                            </div>
                            <Skeleton className="h-12 w-full" />
                            <div className="flex justify-between">
                              <Skeleton className="h-8 w-24" />
                              <div className="flex gap-2">
                                <Skeleton className="h-9 w-20" />
                                <Skeleton className="h-9 w-24" />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : filteredSchedules.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-block p-6 bg-gradient-to-br from-gray-500/10 to-gray-600/10 rounded-full mb-4">
                      <CalendarIcon className="h-16 w-16 text-gray-400" />
                    </div>
                    <p className="text-xl font-bold bg-gradient-to-r from-gray-600 to-gray-500 bg-clip-text text-transparent">
                      Nenhum agendamento {viewMode === 'day' ? 'para esta data' : 'nesta semana'}
                    </p>
                    <p className="text-muted-foreground mt-2">
                      Clique em "Novo Agendamento" para adicionar compromissos
                    </p>
                  </div>
                ) : viewMode === 'week' ? (
                  /* Visualização Semanal */
                  <div className="space-y-6">
                    {schedulesByDay.map(({ date, schedules: daySchedules }) => (
                      <div key={date.toISOString()} className="space-y-3">
                        <div className={`flex items-center gap-3 p-3 rounded-lg ${
                          isSameDay(date, new Date()) 
                            ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/10 border border-blue-500/30' 
                            : 'bg-muted/30'
                        }`}>
                          <CalendarDays className={`h-5 w-5 ${isSameDay(date, new Date()) ? 'text-blue-600' : 'text-muted-foreground'}`} />
                          <span className={`font-bold ${isSameDay(date, new Date()) ? 'text-blue-600' : ''}`}>
                            {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                          </span>
                          <Badge variant="secondary" className="ml-auto">
                            {daySchedules.length} agendamento(s)
                          </Badge>
                        </div>
                        
                        {daySchedules.length === 0 ? (
                          <p className="text-sm text-muted-foreground pl-4">Nenhum agendamento</p>
                        ) : (
                          <div className="space-y-3 pl-4">
                            {daySchedules.map((schedule) => (
                              <ScheduleCard 
                                key={schedule.id}
                                schedule={schedule}
                                employees={employees}
                                userProfile={userProfile}
                                isAdmin={isAdmin}
                                canCancelSchedules={canCancelSchedules}
                                canDeleteSchedules={canDeleteSchedules}
                                onEdit={handleEditSchedule}
                                onRedirect={handleRedirect}
                                onCancelClick={() => {
                                  setSelectedScheduleForAction(schedule);
                                  setCancelDialogOpen(true);
                                }}
                                onDeleteClick={() => {
                                  setSelectedScheduleForAction(schedule);
                                  setDeleteDialogOpen(true);
                                }}
                                onCompleteClick={() => {
                                  setSelectedScheduleForAction(schedule);
                                  setCompleteDialogOpen(true);
                                }}
                                onPresenceUpdate={refetchSchedules}
                                getStatusBadge={getStatusBadge}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Visualização Diária */
                  <div className="space-y-4">
                     {filteredSchedules.map((schedule) => (
                       <ScheduleCard 
                         key={schedule.id}
                         schedule={schedule}
                         employees={employees}
                         userProfile={userProfile}
                         isAdmin={isAdmin}
                         canCancelSchedules={canCancelSchedules}
                         canDeleteSchedules={canDeleteSchedules}
                         onEdit={handleEditSchedule}
                         onRedirect={handleRedirect}
                         onCancelClick={() => {
                           setSelectedScheduleForAction(schedule);
                           setCancelDialogOpen(true);
                         }}
                         onDeleteClick={() => {
                           setSelectedScheduleForAction(schedule);
                           setDeleteDialogOpen(true);
                         }}
                         onCompleteClick={() => {
                           setSelectedScheduleForAction(schedule);
                           setCompleteDialogOpen(true);
                         }}
                         onPresenceUpdate={refetchSchedules}
                         getStatusBadge={getStatusBadge}
                       />
                     ))}
                   </div>
                 )}
               </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Dialogs */}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl z-50 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 hover:scale-110 transition-all duration-300"
              onClick={() => {
                setEditingSchedule(null);
                const defaultEmployeeId = !isAdmin && employees.length === 1 ? employees[0].user_id : '';
                setNewAppointment({
                  client_id: '',
                  employee_id: defaultEmployeeId,
                  title: 'Consulta',
                  start_time: '',
                  end_time: '',
                  notes: '',
                  unit: 'madre',
                  sessionCount: 1
                });
              }}
            >
              <Plus className="h-7 w-7" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>
                {editingSchedule ? 'Editar Agendamento' : 'Novo Agendamento'}
              </DialogTitle>
            </DialogHeader>
            
            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto px-1">
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client_id">Paciente</Label>
                    <PatientCommandAutocomplete
                      value={newAppointment.client_id}
                      onValueChange={(value) => setNewAppointment({ ...newAppointment, client_id: value })}
                      placeholder="Buscar paciente por nome, CPF, telefone ou email..."
                      unitFilter={
                        userProfile?.employee_role === 'coordinator_madre' ? 'madre' :
                        userProfile?.employee_role === 'coordinator_floresta' ? 'floresta' :
                        userProfile?.employee_role === 'coordinator_atendimento_floresta' ? 'atendimento_floresta' :
                        'all'
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employee_id">Profissional</Label>
                    <ProfessionalCommandAutocomplete
                      value={newAppointment.employee_id}
                      onValueChange={(value) => setNewAppointment({ ...newAppointment, employee_id: value })}
                      placeholder="Buscar profissional por nome, email ou telefone..."
                      unitFilter={
                        // Para coordenadores, usar sua unidade específica
                        userProfile?.employee_role === 'coordinator_madre' ? 'madre' :
                        userProfile?.employee_role === 'coordinator_floresta' ? 'floresta' :
                        userProfile?.employee_role === 'coordinator_atendimento_floresta' ? 'atendimento_floresta' :
                        // Para recepcionistas, usar a unidade do agendamento sendo criado
                        userProfile?.employee_role === 'receptionist' ? newAppointment.unit :
                        // Para diretores, mostrar todos
                        'all'
                      }
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Data e Hora Início</Label>
                    <Input
                      id="start_time"
                      type="datetime-local"
                      value={newAppointment.start_time}
                      onChange={(e) => setNewAppointment({...newAppointment, start_time: e.target.value})}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_time">Data e Hora Fim</Label>
                    <Input
                      id="end_time"
                      type="datetime-local"
                      value={newAppointment.end_time}
                      onChange={(e) => setNewAppointment({...newAppointment, end_time: e.target.value})}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Tipo de Consulta</Label>
                    <Select value={newAppointment.title} onValueChange={(value) => setNewAppointment({...newAppointment, title: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-md z-50">
                        <SelectItem value="Consulta">Consulta</SelectItem>
                        <SelectItem value="Primeira Consulta">Primeira Consulta</SelectItem>
                        <SelectItem value="Avaliação">Avaliação</SelectItem>
                        <SelectItem value="Retorno">Retorno</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unidade</Label>
                    <Select 
                      value={newAppointment.unit} 
                      onValueChange={(value) => setNewAppointment({...newAppointment, unit: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a unidade" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-md z-50">
                        <SelectItem value="madre">Clínica Social (MADRE)</SelectItem>
                        <SelectItem value="floresta">Neuroavaliação (Floresta)</SelectItem>
                        <SelectItem value="atendimento_floresta">Atendimento Floresta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {!editingSchedule && (
                  <div className="space-y-2">
                    <Label htmlFor="sessionCount">Quantidade de Sessões</Label>
                    <Input
                      id="sessionCount"
                      type="number"
                      min="1"
                      max="52"
                      value={newAppointment.sessionCount}
                      onChange={(e) => setNewAppointment({...newAppointment, sessionCount: Math.max(1, parseInt(e.target.value) || 1)})}
                      placeholder="1"
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Defina quantas sessões sequenciais semanais deseja criar. O sistema verificará automaticamente conflitos de horário.
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={newAppointment.notes}
                    onChange={(e) => setNewAppointment({...newAppointment, notes: e.target.value})}
                    placeholder="Observações opcionais..."
                    rows={4}
                    className="resize-none w-full"
                  />
                </div>
              </div>
            </div>
            
            {/* Fixed footer with action buttons */}
            <div className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t bg-background">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateAppointment}>
                {editingSchedule ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <CompleteAttendanceDialog
          schedule={selectedScheduleForAction}
          isOpen={completeDialogOpen}
          onClose={() => setCompleteDialogOpen(false)}
          onComplete={refetchSchedules}
        />

        <CancelAppointmentDialog
          schedule={selectedScheduleForAction}
          isOpen={cancelDialogOpen}
          onClose={() => setCancelDialogOpen(false)}
          onCancel={handleCancelAppointment}
          onCancelMultiple={handleCancelMultipleAppointments}
        />

        <DeleteAppointmentDialog
          schedule={selectedScheduleForAction}
          isOpen={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onDelete={handleDeleteAppointment}
          onDeleteMultiple={handleDeleteMultipleAppointments}
        />
      </div>
    </div>
  );
}
