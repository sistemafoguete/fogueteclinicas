import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { Bell, Plus, Calendar, MapPin, Users, Clock, Trash2, Edit, Eye, CheckCircle, XCircle, Filter, UserPlus, UserMinus, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface MeetingAlert {
  id: string;
  title: string;
  message: string;
  meeting_date: string;
  meeting_location?: string;
  meeting_room?: string;
  virtual_link?: string;
  client_id?: string;
  created_by: string;
  created_at: string;
  participants: string[];
  is_active: boolean;
  status: 'scheduled' | 'completed' | 'cancelled';
  max_participants?: number | null;
  is_open_enrollment?: boolean;
  clients?: { name: string };
  profiles?: { name: string };
}

interface Employee {
  id: string;
  user_id: string;
  name: string;
}

interface Client {
  id: string;
  name: string;
}

export const MeetingAlertManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isDirector, hasAnyPermission } = usePermissions();
  const canManageMeetings = isDirector || hasAnyPermission(['manage_permissions', 'view_employees']);

  const [alerts, setAlerts] = useState<MeetingAlert[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<MeetingAlert | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');

  const [newAlert, setNewAlert] = useState({
    title: '',
    message: '',
    meeting_date: '',
    meeting_time: '',
    meeting_location: '',
    meeting_room: '',
    virtual_link: '',
    client_id: 'none',
    participants: [] as string[],
    max_participants: null as number | null,
    is_open_enrollment: true
  });

  useEffect(() => {
    loadData();
  }, [filterStatus, filterDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadAlerts(),
        loadEmployees(),
        loadClients()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      let query = supabase
        .from('meeting_alerts')
        .select('*')
        .eq('is_active', true);

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      if (filterDate) {
        const startOfDay = new Date(filterDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(filterDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.gte('meeting_date', startOfDay.toISOString()).lte('meeting_date', endOfDay.toISOString());
      }

      query = query.order('meeting_date', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      setAlerts((data as any) || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const handleCreateAlert = async () => {
    if (!newAlert.title || !newAlert.message || !newAlert.meeting_date || !newAlert.meeting_time) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
      });
      return;
    }

    if (!newAlert.meeting_location || !newAlert.meeting_room) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Local e sala são obrigatórios para agendar reuniões.",
      });
      return;
    }

    try {
      const meetingDateTime = new Date(`${newAlert.meeting_date}T${newAlert.meeting_time}`).toISOString();
      
      const { error } = await supabase
        .from('meeting_alerts')
        .insert([{
          title: newAlert.title,
          message: newAlert.message,
          meeting_date: meetingDateTime,
          meeting_location: newAlert.meeting_location,
          meeting_room: newAlert.meeting_room,
          virtual_link: newAlert.virtual_link || null,
          client_id: newAlert.client_id === 'none' ? null : newAlert.client_id,
          created_by: user?.id,
          participants: newAlert.participants,
          max_participants: newAlert.max_participants,
          is_open_enrollment: newAlert.is_open_enrollment
        }]);

      if (error) throw error;

      // Criar notificações para participantes convidados
      if (newAlert.participants.length > 0) {
        const notifications = newAlert.participants.map(participantId => ({
          employee_id: participantId,
          client_id: newAlert.client_id === 'none' ? null : newAlert.client_id,
          schedule_id: null,
          title: `Nova Reunião: ${newAlert.title}`,
          message: `Você foi convidado para "${newAlert.title}" em ${format(new Date(meetingDateTime), "dd/MM/yyyy 'às' HH:mm")} - ${newAlert.meeting_location}, ${newAlert.meeting_room}`,
          appointment_date: meetingDateTime,
          appointment_time: newAlert.meeting_time,
          notification_type: 'meeting_scheduled'
        }));

        await supabase
          .from('appointment_notifications')
          .insert(notifications);
      }

      toast({
        title: "Sucesso",
        description: "Reunião criada com sucesso!",
      });

      setIsCreateDialogOpen(false);
      resetForm();
      loadAlerts();
    } catch (error) {
      console.error('Error creating alert:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível criar o alerta.",
      });
    }
  };

  const handleUpdateAlert = async () => {
    if (!selectedAlert) return;
    if (!newAlert.title || !newAlert.message || !newAlert.meeting_date || !newAlert.meeting_time) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
      });
      return;
    }

    try {
      const meetingDateTime = new Date(`${newAlert.meeting_date}T${newAlert.meeting_time}`).toISOString();
      
      const { error } = await supabase
        .from('meeting_alerts')
        .update({
          title: newAlert.title,
          message: newAlert.message,
          meeting_date: meetingDateTime,
          meeting_location: newAlert.meeting_location,
          meeting_room: newAlert.meeting_room,
          virtual_link: newAlert.virtual_link || null,
          client_id: newAlert.client_id === 'none' ? null : newAlert.client_id,
          participants: newAlert.participants,
          max_participants: newAlert.max_participants,
          is_open_enrollment: newAlert.is_open_enrollment
        })
        .eq('id', selectedAlert.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Reunião atualizada com sucesso!",
      });

      setIsEditDialogOpen(false);
      setSelectedAlert(null);
      resetForm();
      loadAlerts();
    } catch (error) {
      console.error('Error updating alert:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar a reunião.",
      });
    }
  };

  const handleChangeStatus = async (alertId: string, newStatus: 'scheduled' | 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('meeting_alerts')
        .update({ status: newStatus })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Status alterado para ${newStatus === 'scheduled' ? 'Agendada' : newStatus === 'completed' ? 'Realizada' : 'Cancelada'}!`,
      });

      loadAlerts();
    } catch (error) {
      console.error('Error changing status:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível alterar o status.",
      });
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (!confirm('Tem certeza que deseja excluir este alerta?')) return;

    try {
      const { error } = await supabase
        .from('meeting_alerts')
        .update({ is_active: false })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Alerta excluído com sucesso!",
      });

      loadAlerts();
    } catch (error) {
      console.error('Error deleting alert:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir o alerta.",
      });
    }
  };

  const handleJoinMeeting = async (alertId: string, alert: MeetingAlert) => {
    if (!user?.id) return;

    if (alert.participants?.includes(user.id)) {
      toast({
        title: "Info",
        description: "Você já está inscrito nesta reunião",
      });
      return;
    }

    if (alert.max_participants && alert.participants && alert.participants.length >= alert.max_participants) {
      toast({
        variant: "destructive",
        title: "Reunião lotada",
        description: `Máximo de ${alert.max_participants} participantes atingido.`,
      });
      return;
    }

    try {
      const updatedParticipants = [...(alert.participants || []), user.id];
      
      const { error } = await supabase
        .from('meeting_alerts')
        .update({ participants: updatedParticipants })
        .eq('id', alertId);

      if (error) throw error;

      await supabase.from('appointment_notifications').insert({
        employee_id: user.id,
        client_id: alert.client_id || null,
        schedule_id: null,
        title: `Inscrição Confirmada: ${alert.title}`,
        message: `Você se inscreveu em "${alert.title}" - ${format(new Date(alert.meeting_date), "dd/MM/yyyy 'às' HH:mm")} - ${alert.meeting_location}, ${alert.meeting_room}`,
        appointment_date: alert.meeting_date,
        appointment_time: format(new Date(alert.meeting_date), 'HH:mm'),
        notification_type: 'meeting_joined'
      });

      toast({
        title: "Sucesso!",
        description: "Inscrição realizada com sucesso!",
      });
      loadAlerts();
    } catch (error: any) {
      console.error('Erro ao se inscrever:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível se inscrever.",
      });
    }
  };

  const handleLeaveMeeting = async (alertId: string, alert: MeetingAlert) => {
    if (!user?.id) return;

    try {
      const updatedParticipants = (alert.participants || []).filter(id => id !== user.id);
      
      const { error } = await supabase
        .from('meeting_alerts')
        .update({ participants: updatedParticipants })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Inscrição cancelada",
      });
      loadAlerts();
    } catch (error: any) {
      console.error('Erro ao cancelar:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível cancelar a inscrição.",
      });
    }
  };

  const openEditDialog = (alert: MeetingAlert) => {
    setSelectedAlert(alert);
    const date = new Date(alert.meeting_date);
    setNewAlert({
      title: alert.title,
      message: alert.message,
      meeting_date: date.toISOString().split('T')[0],
      meeting_time: date.toTimeString().slice(0, 5),
      meeting_location: alert.meeting_location || '',
      meeting_room: alert.meeting_room || '',
      virtual_link: alert.virtual_link || '',
      client_id: alert.client_id || 'none',
      participants: alert.participants || [],
      max_participants: alert.max_participants || null,
      is_open_enrollment: alert.is_open_enrollment ?? true
    });
    setIsEditDialogOpen(true);
  };

  const openDetailsDialog = (alert: MeetingAlert) => {
    setSelectedAlert(alert);
    setIsDetailsDialogOpen(true);
  };

  const resetForm = () => {
    setNewAlert({
      title: '',
      message: '',
      meeting_date: '',
      meeting_time: '',
      meeting_location: '',
      meeting_room: '',
      virtual_link: '',
      client_id: 'none',
      participants: [],
      max_participants: null,
      is_open_enrollment: true
    });
    setSelectedAlert(null);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: { label: 'Agendada', variant: 'default' as const, icon: Calendar },
      completed: { label: 'Realizada', variant: 'default' as const, icon: CheckCircle },
      cancelled: { label: 'Cancelada', variant: 'destructive' as const, icon: XCircle }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const toggleParticipant = (employeeId: string) => {
    setNewAlert(prev => {
      const currentParticipants = prev.participants || [];
      if (currentParticipants.includes(employeeId)) {
        return {
          ...prev,
          participants: currentParticipants.filter(id => id !== employeeId)
        };
      } else {
        if (prev.max_participants && currentParticipants.length >= prev.max_participants) {
          toast({
            variant: "destructive",
            title: "Limite atingido",
            description: `Máximo de ${prev.max_participants} participantes.`,
          });
          return prev;
        }
        return {
          ...prev,
          participants: [...currentParticipants, employeeId]
        };
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Alertas de Reunião</h2>
          <p className="text-muted-foreground">
            {canManageMeetings ? 'Gerencie alertas e notificações para reuniões' : 'Veja e participe de reuniões agendadas'}
          </p>
        </div>
        
        {canManageMeetings && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Reunião
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Agendar Reunião</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Título da Reunião *</Label>
                    <Input
                      value={newAlert.title}
                      onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })}
                      placeholder="Ex: Reunião de Planejamento Semanal"
                    />
                  </div>
                  <div>
                    <Label>Data *</Label>
                    <Input
                      type="date"
                      value={newAlert.meeting_date}
                      onChange={(e) => setNewAlert({ ...newAlert, meeting_date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label>Horário *</Label>
                    <Input
                      type="time"
                      value={newAlert.meeting_time}
                      onChange={(e) => setNewAlert({ ...newAlert, meeting_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Local *</Label>
                    <Input
                      value={newAlert.meeting_location}
                      onChange={(e) => setNewAlert({ ...newAlert, meeting_location: e.target.value })}
                      placeholder="Ex: Unidade Madre"
                    />
                  </div>
                  <div>
                    <Label>Sala *</Label>
                    <Input
                      value={newAlert.meeting_room}
                      onChange={(e) => setNewAlert({ ...newAlert, meeting_room: e.target.value })}
                      placeholder="Ex: Sala de Reuniões"
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Link Virtual (opcional)</Label>
                  <Input
                    type="url"
                    value={newAlert.virtual_link}
                    onChange={(e) => setNewAlert({ ...newAlert, virtual_link: e.target.value })}
                    placeholder="https://meet.google.com/..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Para reuniões online (Zoom, Google Meet, Teams, etc.)
                  </p>
                </div>
                
                <div>
                  <Label>Descrição/Agenda *</Label>
                  <Textarea
                    value={newAlert.message}
                    onChange={(e) => setNewAlert({ ...newAlert, message: e.target.value })}
                    placeholder="Descreva a pauta e objetivos da reunião..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Limite de Vagas (opcional)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newAlert.max_participants || ''}
                      onChange={(e) => setNewAlert({ ...newAlert, max_participants: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="Ex: 20"
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_open_enrollment"
                        checked={newAlert.is_open_enrollment}
                        onChange={(e) => setNewAlert({ ...newAlert, is_open_enrollment: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="is_open_enrollment" className="font-normal cursor-pointer">
                        Permitir inscrições abertas
                      </Label>
                    </div>
                  </div>
                </div>

                {newAlert.is_open_enrollment && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      ℹ️ Todos os funcionários poderão se inscrever para participar desta reunião.
                    </p>
                  </div>
                )}

                <div>
                  <Label>Convidar Participantes (opcional)</Label>
                  <ScrollArea className="h-[150px] border rounded-md p-3">
                    <div className="grid grid-cols-2 gap-2">
                      {employees.map(employee => (
                        <div key={employee.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`participant-${employee.id}`}
                            checked={newAlert.participants.includes(employee.user_id)}
                            onChange={() => toggleParticipant(employee.user_id)}
                            className="rounded"
                          />
                          <label htmlFor={`participant-${employee.id}`} className="text-sm cursor-pointer">
                            {employee.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground mt-1">
                    {newAlert.participants.length} convidados diretos
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateAlert} disabled={loading}>
                    <Bell className="h-4 w-4 mr-2" />
                    Agendar Reunião
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="scheduled">Agendadas</SelectItem>
                  <SelectItem value="completed">Realizadas</SelectItem>
                  <SelectItem value="cancelled">Canceladas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label>Data</Label>
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                setFilterStatus('all');
                setFilterDate('');
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Reuniões</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoje</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {alerts.filter(alert => 
                new Date(alert.meeting_date).toDateString() === new Date().toDateString()
              ).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Minhas Inscrições</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {alerts.filter(alert => alert.participants?.includes(user?.id || '')).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reuniões</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma reunião encontrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Vagas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map(alert => (
                    <TableRow key={alert.id}>
                      <TableCell className="font-medium">{alert.title}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{format(new Date(alert.meeting_date), 'dd/MM/yyyy')}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(alert.meeting_date), 'HH:mm')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-1">
                          <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <div>{alert.meeting_location}</div>
                            {alert.meeting_room && (
                              <div className="text-xs text-muted-foreground">{alert.meeting_room}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="text-xs w-fit">
                            <Users className="h-3 w-3 mr-1" />
                            {alert.participants?.length || 0}
                            {alert.max_participants ? `/${alert.max_participants}` : ''}
                          </Badge>
                          {alert.is_open_enrollment && alert.status === 'scheduled' && (
                            <span className="text-xs text-green-600">Abertas</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(alert.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 flex-wrap">
                          {/* Link virtual se disponível */}
                          {alert.virtual_link && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => window.open(alert.virtual_link, '_blank')}
                              title="Abrir link da reunião virtual"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                          
                          {/* Botões de inscrição para funcionários */}
                          {alert.is_open_enrollment && alert.status === 'scheduled' && (
                            <>
                              {alert.participants?.includes(user?.id || '') ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleLeaveMeeting(alert.id, alert)}
                                  title="Cancelar inscrição"
                                >
                                  <UserMinus className="h-3 w-3" />
                                </Button>
                              ) : (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleJoinMeeting(alert.id, alert)}
                                  disabled={alert.max_participants ? (alert.participants?.length || 0) >= alert.max_participants : false}
                                  title="Participar"
                                >
                                  <UserPlus className="h-3 w-3" />
                                </Button>
                              )}
                            </>
                          )}
                          
                          {/* Botões de gerenciamento para coordenadores */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetailsDialog(alert)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          {canManageMeetings && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(alert)}
                                title="Editar"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAlert(alert.id)}
                                title="Excluir"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog - similar structure to create, won't duplicate here for brevity */}
      {/* Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Reunião</DialogTitle>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Título</Label>
                  <p className="font-medium text-lg">{selectedAlert.title}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data e Hora</Label>
                  <p>{format(new Date(selectedAlert.meeting_date), "dd/MM/yyyy 'às' HH:mm")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedAlert.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Local</Label>
                  <p>{selectedAlert.meeting_location}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Sala</Label>
                  <p>{selectedAlert.meeting_room}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Vagas</Label>
                  <p>
                    {selectedAlert.participants?.length || 0}
                    {selectedAlert.max_participants ? ` / ${selectedAlert.max_participants}` : ' (sem limite)'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Inscrições</Label>
                  <p>{selectedAlert.is_open_enrollment ? 'Abertas' : 'Fechadas'}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Descrição</Label>
                <p className="whitespace-pre-wrap mt-1">{selectedAlert.message}</p>
              </div>

              {selectedAlert.participants && selectedAlert.participants.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">
                    Participantes Inscritos ({selectedAlert.participants.length})
                  </Label>
                  <ScrollArea className="h-[120px] border rounded-md p-3 mt-2">
                    <div className="space-y-1">
                      {employees
                        .filter(emp => selectedAlert.participants?.includes(emp.user_id))
                        .map(emp => (
                          <div key={emp.id} className="flex items-center gap-2 text-sm">
                            <Users className="h-3 w-3" />
                            {emp.name}
                            {emp.user_id === user?.id && (
                              <Badge variant="secondary" className="text-xs">Você</Badge>
                            )}
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t">
                <div className="flex gap-2">
                  {canManageMeetings && selectedAlert.status === 'scheduled' && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          handleChangeStatus(selectedAlert.id, 'completed');
                          setIsDetailsDialogOpen(false);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Marcar Realizada
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          handleChangeStatus(selectedAlert.id, 'cancelled');
                          setIsDetailsDialogOpen(false);
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    </>
                  )}
                </div>
                <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
