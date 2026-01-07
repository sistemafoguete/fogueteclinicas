import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, 
  User, 
  Plus, 
  Activity,
  FileText,
  Calendar,
  CheckCircle,
  AlertCircle,
  Star,
  Eye
} from 'lucide-react';

interface ServiceRecord {
  id: string;
  date: string;
  service_type: string;
  professional_name: string;
  professional_role: string;
  duration?: number;
  status: string;
  detailed_notes: string;
  techniques_used?: string;
  materials_used?: any[];
  session_objectives?: string;
  patient_response?: string;
  next_session_plan?: string;
  created_at: string;
  source: 'schedule' | 'medical_record' | 'session_report' | 'attendance_report';
  // Campos adicionais para avaliações completas
  quality_rating?: number;
  cooperation_rating?: number;
  goals_rating?: number;
  effort_rating?: number;
  attachments?: any[];
  objectives_achieved?: string;
  clinical_observations?: string;
  amount_charged?: number;
  payment_method?: string;
  // Novos campos de avaliação
  session_quality_notes?: string;
  cooperation_notes?: string;
  goals_achievement_notes?: string;
  effort_assessment_notes?: string;
  // Campos completos dos attendance_reports
  patient_name?: string;
  start_time?: string;
  end_time?: string;
  professional_amount?: number;
  institution_amount?: number;
  completed_by_name?: string;
  validation_status?: string;
  validated_at?: string;
  validated_by_name?: string;
  rejection_reason?: string;
  schedule_id?: string;
}

interface ServiceHistoryProps {
  clientId: string;
}

export default function ServiceHistory({ clientId }: ServiceHistoryProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [addServiceDialogOpen, setAddServiceDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ServiceRecord | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [newService, setNewService] = useState({
    service_type: '',
    date: '',
    time: '',
    duration: '60',
    detailed_notes: '',
    techniques_used: '',
    session_objectives: '',
    patient_response: '',
    next_session_plan: '',
    materials_used: ''
  });

  useEffect(() => {
    loadServiceHistory();
  }, [clientId]);

  const loadServiceHistory = async () => {
    setLoading(true);
    try {
      const records: ServiceRecord[] = [];

      // Carregar schedules (agendamentos)
      const { data: schedules, error: schedulesError } = await supabase
        .from('schedules')
        .select(`
          id,
          title,
          start_time,
          end_time,
          status,
          description,
          notes,
          created_by
        `)
        .eq('client_id', clientId)
        .order('start_time', { ascending: false });

      if (schedulesError) throw schedulesError;

      if (schedules && schedules.length > 0) {
        // Buscar profiles dos criadores separadamente
        const creatorIds = [...new Set(schedules.map(s => s.created_by))].filter(id => id);
        let schedulesProfiles: any[] = [];
        
        if (creatorIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('user_id, name, employee_role')
            .in('user_id', creatorIds);
          schedulesProfiles = profilesData || [];
        }

        schedules.forEach(schedule => {
          const profile = schedulesProfiles.find(p => p.user_id === schedule.created_by);
          records.push({
            id: schedule.id,
            date: schedule.start_time,
            service_type: schedule.title || 'Atendimento',
            professional_name: profile?.name || 'Profissional',
            professional_role: profile?.employee_role || 'Staff',
            duration: schedule.end_time ? Math.round((new Date(schedule.end_time).getTime() - new Date(schedule.start_time).getTime()) / (1000 * 60)) : undefined,
            status: schedule.status || 'scheduled',
            detailed_notes: schedule.description || schedule.notes || '',
            created_at: schedule.start_time,
            source: 'schedule'
          });
        });
      }

      // Carregar medical records
      const { data: medicalRecords, error: medicalError } = await supabase
        .from('medical_records')
        .select(`
          id,
          session_date,
          session_type,
          progress_notes,
          treatment_plan,
          symptoms,
          session_duration,
          status,
          employee_id
        `)
        .eq('client_id', clientId)
        .order('session_date', { ascending: false });

      if (medicalError) throw medicalError;

      if (medicalRecords && medicalRecords.length > 0) {
        // Buscar profiles dos profissionais separadamente
        const employeeIds = [...new Set(medicalRecords.map(r => r.employee_id))].filter(id => id);
        let medicalProfiles: any[] = [];
        
        if (employeeIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('user_id, name, employee_role')
            .in('user_id', employeeIds);
          medicalProfiles = profilesData || [];
        }

        medicalRecords.forEach(record => {
          const profile = medicalProfiles.find(p => p.user_id === record.employee_id);
          records.push({
            id: `medical_${record.id}`,
            date: record.session_date,
            service_type: record.session_type || 'Consulta Médica',
            professional_name: profile?.name || 'Profissional',
            professional_role: profile?.employee_role || 'Staff',
            duration: record.session_duration,
            status: record.status || 'completed',
            detailed_notes: record.progress_notes || '',
            session_objectives: record.treatment_plan || '',
            patient_response: record.symptoms || '',
            created_at: record.session_date,
            source: 'medical_record'
          });
        });
      }

      // Carregar attendance reports (relatórios de atendimento completos) - apenas validados
      const { data: attendanceReports, error: attendanceError } = await supabase
        .from('attendance_reports')
        .select(`
          id,
          schedule_id,
          start_time,
          end_time,
          session_duration,
          attendance_type,
          professional_name,
          patient_name,
          session_notes,
          observations,
          techniques_used,
          patient_response,
          next_session_plan,
          materials_used,
          amount_charged,
          professional_amount,
          institution_amount,
          attachments,
          status,
          employee_id,
          created_at,
          completed_by_name,
          validation_status,
          validated_at,
          validated_by_name,
          rejection_reason
        `)
        .eq('client_id', clientId)
        .eq('validation_status', 'validated') // Só mostrar atendimentos validados
        .order('start_time', { ascending: false });

      if (attendanceError) throw attendanceError;

      if (attendanceReports) {
        attendanceReports.forEach(report => {
          records.push({
            id: `attendance_${report.id}`,
            date: report.start_time,
            service_type: report.attendance_type || 'Atendimento Concluído',
            professional_name: report.professional_name || 'Profissional',
            professional_role: 'Staff', // Pode ser melhorado buscando da tabela profiles
            duration: report.session_duration,
            status: 'completed',
            detailed_notes: report.session_notes || '',
            techniques_used: report.techniques_used || '',
            session_objectives: '', // Pode ser adicionado se necessário
            patient_response: report.patient_response || '',
            next_session_plan: report.next_session_plan || '',
            materials_used: Array.isArray(report.materials_used) ? report.materials_used : [],
            clinical_observations: report.observations || '',
            attachments: Array.isArray(report.attachments) ? report.attachments : [],
            amount_charged: report.amount_charged || 0,
            created_at: report.created_at,
            source: 'attendance_report',
            // Campos completos dos attendance_reports
            patient_name: report.patient_name,
            start_time: report.start_time,
            end_time: report.end_time,
            professional_amount: report.professional_amount || 0,
            institution_amount: report.institution_amount || 0,
            completed_by_name: report.completed_by_name,
            validation_status: report.validation_status,
            validated_at: report.validated_at,
            validated_by_name: report.validated_by_name,
            rejection_reason: report.rejection_reason,
            schedule_id: report.schedule_id
          });
        });
      }

      // Coletar schedule_ids dos attendance_reports para evitar duplicação
      const attendanceScheduleIds = new Set(
        attendanceReports
          ?.filter(r => r.schedule_id)
          .map(r => r.schedule_id) || []
      );

      // Carregar employee reports (relatórios detalhados) - apenas validados
      const { data: reports, error: reportsError } = await supabase
        .from('employee_reports')
        .select(`
          id,
          schedule_id,
          session_date,
          session_type,
          professional_notes,
          techniques_used,
          session_objectives,
          patient_response,
          next_session_plan,
          session_duration,
          materials_used,
          quality_rating,
          effort_rating,
          patient_cooperation,
          goal_achievement,
          attachments,
          materials_cost,
          employee_id,
          profiles:employee_id (name, employee_role),
          validation_status,
          validated_at,
          validated_by_name
        `)
        .eq('client_id', clientId)
        .eq('validation_status', 'validated') // Só mostrar relatórios validados
        .order('session_date', { ascending: false });

      if (reportsError) throw reportsError;

      if (reports) {
        // Filtrar employee_reports que não têm attendance_report correspondente
        reports
          .filter(report => !report.schedule_id || !attendanceScheduleIds.has(report.schedule_id))
          .forEach(report => {
            records.push({
              id: `report_${report.id}`,
              date: report.session_date,
              service_type: report.session_type || 'Sessão Terapêutica',
              professional_name: report.profiles?.name || 'Profissional',
              professional_role: report.profiles?.employee_role || 'Staff',
              duration: report.session_duration,
              status: 'completed',
              detailed_notes: report.professional_notes || '',
              techniques_used: report.techniques_used || '',
              session_objectives: report.session_objectives || '',
              patient_response: report.patient_response || '',
              next_session_plan: report.next_session_plan || '',
              materials_used: Array.isArray(report.materials_used) ? report.materials_used : [],
              quality_rating: report.quality_rating,
              cooperation_rating: report.patient_cooperation,
              goals_rating: report.goal_achievement,
              effort_rating: report.effort_rating,
              attachments: Array.isArray(report.attachments) ? report.attachments : [],
              amount_charged: report.materials_cost || 0,
              created_at: report.session_date,
              source: 'session_report'
            });
          });
      }

      // Ordenar todos os registros por data (mais recente primeiro)
      records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setServiceRecords(records);
    } catch (error) {
      console.error('Error loading service history:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar o histórico de serviços.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = async () => {
    if (!newService.service_type || !newService.date || !newService.time) return;

    setLoading(true);
    try {
      const startDateTime = new Date(`${newService.date}T${newService.time}`);
      const endDateTime = new Date(startDateTime.getTime() + parseInt(newService.duration) * 60000);

      // Inserir no employee_reports para registros detalhados
      const { error } = await supabase
        .from('employee_reports')
        .insert({
          client_id: clientId,
          employee_id: user?.id,
          session_date: newService.date,
          session_type: newService.service_type,
          session_duration: parseInt(newService.duration),
          professional_notes: newService.detailed_notes,
          techniques_used: newService.techniques_used,
          session_objectives: newService.session_objectives,
          patient_response: newService.patient_response,
          next_session_plan: newService.next_session_plan,
          materials_used: newService.materials_used ? newService.materials_used.split(',').map(m => m.trim()) : []
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Serviço adicionado ao histórico com sucesso!",
      });

      setNewService({
        service_type: '',
        date: '',
        time: '',
        duration: '60',
        detailed_notes: '',
        techniques_used: '',
        session_objectives: '',
        patient_response: '',
        next_session_plan: '',
        materials_used: ''
      });
      setAddServiceDialogOpen(false);
      loadServiceHistory();
    } catch (error) {
      console.error('Error adding service:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível adicionar o serviço.",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'scheduled': return 'Agendado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const getServiceTypeColor = (type: string) => {
    const typeColors = {
      'Psicologia': 'bg-blue-100 text-blue-800',
      'Neuropsicologia': 'bg-purple-100 text-purple-800',
      'Fonoaudiologia': 'bg-green-100 text-green-800',
      'Terapia Ocupacional': 'bg-orange-100 text-orange-800',
      'Fisioterapia': 'bg-red-100 text-red-800',
      'default': 'bg-gray-100 text-gray-800'
    };
    return typeColors[type as keyof typeof typeColors] || typeColors.default;
  };

  const openDetailsDialog = (record: ServiceRecord) => {
    setSelectedRecord(record);
    setDetailsDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Serviços
          </CardTitle>
          <Dialog open={addServiceDialogOpen} onOpenChange={setAddServiceDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Serviço
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-lg md:max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Serviço</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serviceType">Tipo de Serviço</Label>
                    <Select value={newService.service_type} onValueChange={(value) => setNewService({...newService, service_type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Psicologia">Psicologia</SelectItem>
                        <SelectItem value="Neuropsicologia">Neuropsicologia</SelectItem>
                        <SelectItem value="Fonoaudiologia">Fonoaudiologia</SelectItem>
                        <SelectItem value="Terapia Ocupacional">Terapia Ocupacional</SelectItem>
                        <SelectItem value="Fisioterapia">Fisioterapia</SelectItem>
                        <SelectItem value="Consulta Médica">Consulta Médica</SelectItem>
                        <SelectItem value="Avaliação">Avaliação</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duração (minutos)</Label>
                    <Select value={newService.duration} onValueChange={(value) => setNewService({...newService, duration: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutos</SelectItem>
                        <SelectItem value="45">45 minutos</SelectItem>
                        <SelectItem value="60">60 minutos</SelectItem>
                        <SelectItem value="90">90 minutos</SelectItem>
                        <SelectItem value="120">120 minutos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serviceDate">Data do Serviço</Label>
                    <Input
                      id="serviceDate"
                      type="date"
                      value={newService.date}
                      onChange={(e) => setNewService({...newService, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serviceTime">Horário</Label>
                    <Input
                      id="serviceTime"
                      type="time"
                      value={newService.time}
                      onChange={(e) => setNewService({...newService, time: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionObjectives">Objetivos da Sessão</Label>
                  <Textarea
                    id="sessionObjectives"
                    value={newService.session_objectives}
                    onChange={(e) => setNewService({...newService, session_objectives: e.target.value})}
                    placeholder="Descreva os objetivos da sessão..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="detailedNotes">Observações Detalhadas</Label>
                  <Textarea
                    id="detailedNotes"
                    value={newService.detailed_notes}
                    onChange={(e) => setNewService({...newService, detailed_notes: e.target.value})}
                    placeholder="Descreva detalhadamente o que foi realizado na sessão..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="techniquesUsed">Técnicas Utilizadas</Label>
                  <Textarea
                    id="techniquesUsed"
                    value={newService.techniques_used}
                    onChange={(e) => setNewService({...newService, techniques_used: e.target.value})}
                    placeholder="Descreva as técnicas e métodos utilizados..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patientResponse">Resposta do Paciente</Label>
                  <Textarea
                    id="patientResponse"
                    value={newService.patient_response}
                    onChange={(e) => setNewService({...newService, patient_response: e.target.value})}
                    placeholder="Como o paciente respondeu ao tratamento..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nextSessionPlan">Plano para Próxima Sessão</Label>
                  <Textarea
                    id="nextSessionPlan"
                    value={newService.next_session_plan}
                    onChange={(e) => setNewService({...newService, next_session_plan: e.target.value})}
                    placeholder="Planejamento para a próxima sessão..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="materialsUsed">Materiais Utilizados</Label>
                  <Input
                    id="materialsUsed"
                    value={newService.materials_used}
                    onChange={(e) => setNewService({...newService, materials_used: e.target.value})}
                    placeholder="Ex: Jogos cognitivos, exercícios de coordenação..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddServiceDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddService} disabled={loading || !newService.service_type || !newService.date || !newService.time}>
                  {loading ? 'Salvando...' : 'Salvar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Carregando histórico...</div>
          </div>
        ) : serviceRecords.length > 0 ? (
          <div className="space-y-6">
            {serviceRecords.map((record, index) => (
              <div key={record.id} className="relative">
                {/* Linha da timeline */}
                {index < serviceRecords.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-full bg-border"></div>
                )}
                
                <div className="flex gap-4">
                  {/* Indicador da timeline */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                    {getStatusIcon(record.status)}
                  </div>
                  
                  {/* Conteúdo do serviço */}
                  <div className="flex-1 pb-8">
                    <div className="bg-card border rounded-lg p-4 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{record.service_type}</h4>
                            <Badge className={getServiceTypeColor(record.service_type)}>
                              {record.service_type}
                            </Badge>
                            <Badge variant="outline">
                              {getStatusLabel(record.status)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(record.date)}
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {record.professional_name} ({record.professional_role})
                            </div>
                            {record.duration && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {record.duration} min
                              </div>
                            )}
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openDetailsDialog(record)}
                          className="ml-4"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </Button>
                      </div>
                      
                      {/* Detalhes do serviço */}
                      <div className="space-y-3">
                        {/* Info de Validação - para atendimentos validados */}
                        {record.source === 'attendance_report' && record.validated_by_name && record.validated_at && (
                          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                              <h5 className="font-medium text-sm text-green-800 dark:text-green-300">Atendimento Validado</h5>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-green-700 dark:text-green-400">
                              <div>
                                <span className="font-medium">Validado por:</span> {record.validated_by_name}
                              </div>
                              <div>
                                <span className="font-medium">Data da validação:</span> {formatDateTime(record.validated_at)}
                              </div>
                              {record.completed_by_name && (
                                <div>
                                  <span className="font-medium">Finalizado por:</span> {record.completed_by_name}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {record.session_objectives && (
                          <div>
                            <h5 className="font-medium text-sm mb-1">Objetivos da Sessão:</h5>
                            <p className="text-sm text-muted-foreground">{record.session_objectives}</p>
                          </div>
                        )}
                        
                        {record.detailed_notes && (
                          <div>
                            <h5 className="font-medium text-sm mb-1">Observações Detalhadas:</h5>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{record.detailed_notes}</p>
                          </div>
                        )}
                        
                        {record.techniques_used && (
                          <div>
                            <h5 className="font-medium text-sm mb-1">Técnicas Utilizadas:</h5>
                            <p className="text-sm text-muted-foreground">{record.techniques_used}</p>
                          </div>
                        )}
                        
                        {record.patient_response && (
                          <div>
                            <h5 className="font-medium text-sm mb-1">Resposta do Paciente:</h5>
                            <p className="text-sm text-muted-foreground">{record.patient_response}</p>
                          </div>
                        )}
                        
                        {record.next_session_plan && (
                          <div>
                            <h5 className="font-medium text-sm mb-1">Plano para Próxima Sessão:</h5>
                            <p className="text-sm text-muted-foreground">{record.next_session_plan}</p>
                          </div>
                        )}
                        
                        {/* Avaliações da sessão (somente para attendance_report e session_report) */}
                        {(record.source === 'attendance_report' || record.source === 'session_report') && 
                         (record.quality_rating || record.cooperation_rating || record.goals_rating || record.effort_rating) && (
                          <div>
                            <h5 className="font-medium text-sm mb-2">Avaliação da Sessão:</h5>
                            <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded">
                              {record.quality_rating && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">Qualidade Geral:</span>
                                  <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`h-3 w-3 ${
                                          star <= record.quality_rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {record.cooperation_rating && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">Cooperação:</span>
                                  <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`h-3 w-3 ${
                                          star <= record.cooperation_rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {record.goals_rating && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">Objetivos:</span>
                                  <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`h-3 w-3 ${
                                          star <= record.goals_rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {record.effort_rating && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">Esforço:</span>
                                  <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`h-3 w-3 ${
                                          star <= record.effort_rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {record.objectives_achieved && (
                          <div>
                            <h5 className="font-medium text-sm mb-1">Objetivos Alcançados:</h5>
                            <p className="text-sm text-muted-foreground">{record.objectives_achieved}</p>
                          </div>
                        )}
                        
                        {record.clinical_observations && record.clinical_observations !== record.detailed_notes && (
                          <div>
                            <h5 className="font-medium text-sm mb-1">Observações Clínicas:</h5>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{record.clinical_observations}</p>
                          </div>
                        )}

                        {record.materials_used && record.materials_used.length > 0 && (
                          <div>
                            <h5 className="font-medium text-sm mb-2">Materiais Utilizados:</h5>
                            <div className="space-y-2">
                              {record.materials_used.map((material: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center p-2 bg-muted/30 rounded text-sm">
                                  <div>
                                    <span className="font-medium">{material.name || material}</span>
                                    {material.quantity && material.unit && (
                                      <span className="text-muted-foreground ml-2">
                                        {material.quantity} {material.unit}
                                      </span>
                                    )}
                                    {material.observation && (
                                      <div className="text-xs text-muted-foreground mt-1">{material.observation}</div>
                                    )}
                                  </div>
                                  {material.total_cost && (
                                    <div className="text-xs text-muted-foreground">
                                      R$ {material.total_cost.toFixed(2)}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {record.attachments && record.attachments.length > 0 && (
                          <div>
                            <h5 className="font-medium text-sm mb-2">Documentos Anexos:</h5>
                            <div className="space-y-2">
                              {record.attachments.map((attachment: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 p-2 bg-muted/30 rounded text-sm">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span>{attachment.name}</span>
                                  {attachment.size && (
                                    <span className="text-xs text-muted-foreground">
                                      ({(attachment.size / 1024).toFixed(1)}KB)
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {record.amount_charged && record.amount_charged > 0 && (
                          <div>
                            <h5 className="font-medium text-sm mb-1">Valor Cobrado:</h5>
                            <p className="text-sm text-muted-foreground">R$ {record.amount_charged.toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Informações Financeiras - para attendance_report */}
                      {record.source === 'attendance_report' && (record.amount_charged || record.professional_amount || record.institution_amount) && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
                          <h5 className="font-medium text-sm mb-2 text-blue-800 dark:text-blue-300">Informações Financeiras</h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            {record.amount_charged && record.amount_charged > 0 && (
                              <div>
                                <span className="text-xs text-blue-600 dark:text-blue-400 block">Valor Total:</span>
                                <span className="font-medium text-blue-800 dark:text-blue-300">R$ {record.amount_charged.toFixed(2)}</span>
                              </div>
                            )}
                            {record.professional_amount && record.professional_amount > 0 && (
                              <div>
                                <span className="text-xs text-blue-600 dark:text-blue-400 block">Profissional:</span>
                                <span className="font-medium text-blue-800 dark:text-blue-300">R$ {record.professional_amount.toFixed(2)}</span>
                              </div>
                            )}
                            {record.institution_amount && record.institution_amount > 0 && (
                              <div>
                                <span className="text-xs text-blue-600 dark:text-blue-400 block">Fundação:</span>
                                <span className="font-medium text-blue-800 dark:text-blue-300">R$ {record.institution_amount.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Fonte do registro */}
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <FileText className="h-3 w-3" />
                            <span>
                              {record.source === 'schedule' && 'Agendamento'}
                              {record.source === 'medical_record' && 'Registro Médico'}
                              {record.source === 'session_report' && 'Relatório de Sessão'}
                              {record.source === 'attendance_report' && 'Atendimento Concluído'}
                            </span>
                          </div>
                          {/* Link para o agendamento original */}
                          {record.schedule_id && (
                            <a 
                              href={`/schedule?id=${record.schedule_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <Calendar className="h-3 w-3" />
                              Ver Agendamento
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Nenhum serviço registrado no histórico.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Adicione um novo serviço para começar o histórico detalhado.
            </p>
          </div>
        )}
      </CardContent>
      
      {/* Modal de Detalhes Completos */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalhes Completos do Atendimento
            </DialogTitle>
          </DialogHeader>
          
          {selectedRecord && (
            <div className="space-y-6 pt-4">
              {/* Informações Básicas */}
              <div className="bg-muted/30 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Informações Básicas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Tipo de Atendimento:</span>
                    <p className="text-muted-foreground">{selectedRecord.service_type}</p>
                  </div>
                  <div>
                    <span className="font-medium">Data e Hora:</span>
                    <p className="text-muted-foreground">{formatDateTime(selectedRecord.date)}</p>
                  </div>
                  {selectedRecord.patient_name && (
                    <div>
                      <span className="font-medium">Paciente:</span>
                      <p className="text-muted-foreground">{selectedRecord.patient_name}</p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Profissional:</span>
                    <p className="text-muted-foreground">{selectedRecord.professional_name} ({selectedRecord.professional_role})</p>
                  </div>
                  {selectedRecord.start_time && selectedRecord.end_time && (
                    <>
                      <div>
                        <span className="font-medium">Início:</span>
                        <p className="text-muted-foreground">{formatDateTime(selectedRecord.start_time)}</p>
                      </div>
                      <div>
                        <span className="font-medium">Término:</span>
                        <p className="text-muted-foreground">{formatDateTime(selectedRecord.end_time)}</p>
                      </div>
                    </>
                  )}
                  {selectedRecord.duration && (
                    <div>
                      <span className="font-medium">Duração:</span>
                      <p className="text-muted-foreground">{selectedRecord.duration} minutos</p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Status:</span>
                    <p className="text-muted-foreground">{getStatusLabel(selectedRecord.status)}</p>
                  </div>
                  {selectedRecord.completed_by_name && (
                    <div>
                      <span className="font-medium">Finalizado por:</span>
                      <p className="text-muted-foreground">{selectedRecord.completed_by_name}</p>
                    </div>
                  )}
                  {selectedRecord.validated_by_name && selectedRecord.validated_at && (
                    <>
                      <div>
                        <span className="font-medium">Validado por:</span>
                        <p className="text-muted-foreground">{selectedRecord.validated_by_name}</p>
                      </div>
                      <div>
                        <span className="font-medium">Data de Validação:</span>
                        <p className="text-muted-foreground">{formatDateTime(selectedRecord.validated_at)}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <span className="font-medium">Fonte do Registro:</span>
                    <p className="text-muted-foreground">
                      {selectedRecord.source === 'schedule' && 'Agendamento'}
                      {selectedRecord.source === 'medical_record' && 'Registro Médico'}
                      {selectedRecord.source === 'session_report' && 'Relatório de Sessão'}
                      {selectedRecord.source === 'attendance_report' && 'Atendimento Concluído'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Objetivos da Sessão */}
              {selectedRecord.session_objectives && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Objetivos da Sessão
                  </h3>
                  <div className="bg-card border rounded-lg p-4">
                    <p className="whitespace-pre-wrap">{selectedRecord.session_objectives}</p>
                  </div>
                </div>
              )}

              {/* Observações da Sessão */}
              {selectedRecord.detailed_notes && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Observações da Sessão
                  </h3>
                  <div className="bg-card border rounded-lg p-4">
                    <p className="whitespace-pre-wrap">{selectedRecord.detailed_notes}</p>
                  </div>
                </div>
              )}

              {/* Técnicas Utilizadas */}
              {selectedRecord.techniques_used && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Técnicas Utilizadas
                  </h3>
                  <div className="bg-card border rounded-lg p-4">
                    <p className="whitespace-pre-wrap">{selectedRecord.techniques_used}</p>
                  </div>
                </div>
              )}

              {/* Resposta do Paciente */}
              {selectedRecord.patient_response && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Resposta do Paciente
                  </h3>
                  <div className="bg-card border rounded-lg p-4">
                    <p className="whitespace-pre-wrap">{selectedRecord.patient_response}</p>
                  </div>
                </div>
              )}

              {/* Plano para Próxima Sessão */}
              {selectedRecord.next_session_plan && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Plano para Próxima Sessão
                  </h3>
                  <div className="bg-card border rounded-lg p-4">
                    <p className="whitespace-pre-wrap">{selectedRecord.next_session_plan}</p>
                  </div>
                </div>
              )}

              {/* Observações Clínicas */}
              {selectedRecord.clinical_observations && selectedRecord.clinical_observations !== selectedRecord.detailed_notes && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Observações Clínicas
                  </h3>
                  <div className="bg-card border rounded-lg p-4">
                    <p className="whitespace-pre-wrap">{selectedRecord.clinical_observations}</p>
                  </div>
                </div>
              )}

              {/* Objetivos Alcançados */}
              {selectedRecord.objectives_achieved && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Objetivos Alcançados
                  </h3>
                  <div className="bg-card border rounded-lg p-4">
                    <p className="whitespace-pre-wrap">{selectedRecord.objectives_achieved}</p>
                  </div>
                </div>
              )}

              {/* Avaliações da Sessão */}
              {(selectedRecord.source === 'attendance_report' || selectedRecord.source === 'session_report') && 
               (selectedRecord.quality_rating || selectedRecord.cooperation_rating || selectedRecord.goals_rating || selectedRecord.effort_rating) && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Avaliação da Sessão
                  </h3>
                  <div className="bg-card border rounded-lg p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {selectedRecord.quality_rating && (
                        <div className="space-y-2">
                          <span className="font-medium text-base">Qualidade Geral:</span>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-6 w-6 ${
                                    star <= selectedRecord.quality_rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-lg font-semibold text-muted-foreground">
                              {selectedRecord.quality_rating}/5
                            </span>
                          </div>
                          {selectedRecord.session_quality_notes && (
                            <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted/20 rounded">
                              {selectedRecord.session_quality_notes}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {selectedRecord.cooperation_rating && (
                        <div className="space-y-2">
                          <span className="font-medium text-base">Cooperação do Paciente:</span>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-6 w-6 ${
                                    star <= selectedRecord.cooperation_rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-lg font-semibold text-muted-foreground">
                              {selectedRecord.cooperation_rating}/5
                            </span>
                          </div>
                          {selectedRecord.cooperation_notes && (
                            <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted/20 rounded">
                              {selectedRecord.cooperation_notes}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {selectedRecord.goals_rating && (
                        <div className="space-y-2">
                          <span className="font-medium text-base">Alcance dos Objetivos:</span>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-6 w-6 ${
                                    star <= selectedRecord.goals_rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-lg font-semibold text-muted-foreground">
                              {selectedRecord.goals_rating}/5
                            </span>
                          </div>
                          {selectedRecord.goals_achievement_notes && (
                            <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted/20 rounded">
                              {selectedRecord.goals_achievement_notes}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {selectedRecord.effort_rating && (
                        <div className="space-y-2">
                          <span className="font-medium text-base">Avaliação do Esforço:</span>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-6 w-6 ${
                                    star <= selectedRecord.effort_rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-lg font-semibold text-muted-foreground">
                              {selectedRecord.effort_rating}/5
                            </span>
                          </div>
                          {selectedRecord.effort_assessment_notes && (
                            <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted/20 rounded">
                              {selectedRecord.effort_assessment_notes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
               )}

              {/* Materiais Utilizados */}
              {selectedRecord.materials_used && selectedRecord.materials_used.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Materiais Utilizados
                  </h3>
                  <div className="bg-card border rounded-lg p-4">
                    <div className="space-y-3">
                      {selectedRecord.materials_used.map((material: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-start p-3 bg-muted/30 rounded">
                          <div className="flex-1">
                            <div className="font-medium">{material.name || material}</div>
                            {material.quantity && material.unit && (
                              <div className="text-sm text-muted-foreground mt-1">
                                Quantidade: {material.quantity} {material.unit}
                              </div>
                            )}
                            {material.observation && (
                              <div className="text-sm text-muted-foreground mt-1">
                                Observação: {material.observation}
                              </div>
                            )}
                          </div>
                          {material.total_cost && (
                            <div className="text-sm font-medium">
                              R$ {material.total_cost.toFixed(2)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Documentos Anexos */}
              {selectedRecord.attachments && selectedRecord.attachments.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documentos Anexos
                  </h3>
                  <div className="bg-card border rounded-lg p-4">
                    <div className="space-y-2">
                      {selectedRecord.attachments.map((attachment: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-muted/30 rounded">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="font-medium">{attachment.name}</div>
                            {attachment.size && (
                              <div className="text-sm text-muted-foreground">
                                Tamanho: {(attachment.size / 1024).toFixed(1)}KB
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Informações de Validação */}
              {(selectedRecord.validation_status || selectedRecord.rejection_reason) && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Informações de Validação
                  </h3>
                  <div className="bg-card border rounded-lg p-4 space-y-3">
                    {selectedRecord.validation_status && (
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Status de Validação:</span>
                        <Badge variant={selectedRecord.validation_status === 'validated' ? 'default' : 'destructive'}>
                          {selectedRecord.validation_status === 'validated' ? 'Validado' : 
                           selectedRecord.validation_status === 'rejected' ? 'Rejeitado' : 
                           'Pendente'}
                        </Badge>
                      </div>
                    )}
                    {selectedRecord.validated_by_name && (
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Validado por:</span>
                        <span className="text-muted-foreground">{selectedRecord.validated_by_name}</span>
                      </div>
                    )}
                    {selectedRecord.validated_at && (
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Data de Validação:</span>
                        <span className="text-muted-foreground">{formatDateTime(selectedRecord.validated_at)}</span>
                      </div>
                    )}
                    {selectedRecord.rejection_reason && (
                      <div>
                        <span className="font-medium block mb-2">Motivo da Rejeição:</span>
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                          <p className="text-red-800 whitespace-pre-wrap">{selectedRecord.rejection_reason}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Informações Financeiras */}
              {(selectedRecord.amount_charged && selectedRecord.amount_charged > 0) || 
               (selectedRecord.professional_amount && selectedRecord.professional_amount > 0) ||
               (selectedRecord.institution_amount && selectedRecord.institution_amount > 0) ? (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Informações Financeiras
                  </h3>
                  <div className="bg-card border rounded-lg p-4 space-y-3">
                    {selectedRecord.amount_charged && selectedRecord.amount_charged > 0 && (
                      <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded">
                        <span className="font-medium">Valor Total Cobrado:</span>
                        <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                          R$ {selectedRecord.amount_charged.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {selectedRecord.professional_amount && selectedRecord.professional_amount > 0 && (
                      <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <span className="font-medium">Valor para o Profissional:</span>
                        <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                          R$ {selectedRecord.professional_amount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {selectedRecord.institution_amount && selectedRecord.institution_amount > 0 && (
                      <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
                        <span className="font-medium">Valor para a Instituição:</span>
                        <span className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                          R$ {selectedRecord.institution_amount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {/* Custo total dos materiais */}
                    {selectedRecord.materials_used && selectedRecord.materials_used.length > 0 && (
                      (() => {
                        const totalMaterialsCost = selectedRecord.materials_used.reduce((sum: number, material: any) => 
                          sum + (material.total_cost || 0), 0
                        );
                        return totalMaterialsCost > 0 ? (
                          <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded">
                            <span className="font-medium">Custo Total dos Materiais:</span>
                            <span className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                              R$ {totalMaterialsCost.toFixed(2)}
                            </span>
                          </div>
                        ) : null;
                      })()
                    )}
                  </div>
                </div>
              ) : null}

              {/* Link para Agendamento Original */}
              {selectedRecord.schedule_id && (
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Agendamento Original
                  </h3>
                  <a 
                    href={`/schedule?id=${selectedRecord.schedule_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Visualizar o agendamento completo
                  </a>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}