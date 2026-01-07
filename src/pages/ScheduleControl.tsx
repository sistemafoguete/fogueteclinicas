import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isSameDay, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, User, MapPin, FileText, Bell, CheckCircle2, XCircle, AlertCircle, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import ClientDetailsView from '@/components/ClientDetailsView';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoImage from '@/assets/fundacao-dom-bosco-logo.png';
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
  created_by?: string;
  cancelled_by?: string;
  cancellation_reason?: string;
  clients?: {
    name: string;
  };
  profiles?: {
    name: string;
  };
}
type ViewMode = 'day' | 'week' | 'month';
export default function ScheduleControl() {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [selectedScheduleForNotification, setSelectedScheduleForNotification] = useState<Schedule | null>(null);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationReason, setNotificationReason] = useState("");
  const [pdfConfigDialogOpen, setPdfConfigDialogOpen] = useState(false);
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const handleClientClick = async (clientId: string) => {
    try {
      const {
        data,
        error
      } = await supabase.from('clients').select('*').eq('id', clientId).single();
      if (error) throw error;
      if (data) {
        setSelectedClient(data);
        setIsClientDialogOpen(true);
      }
    } catch (error) {
      console.error('Error loading client details:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os detalhes do paciente."
      });
    }
  };
  const handleOpenNotificationDialog = (schedule: Schedule) => {
    setSelectedScheduleForNotification(schedule);
    setNotificationMessage("");
    setNotificationReason("");
    setNotificationDialogOpen(true);
  };
  const handleSendNotification = async () => {
    if (!selectedScheduleForNotification || !notificationMessage.trim()) {
      toast({
        title: "Mensagem obrigatória",
        description: "Por favor, escreva uma mensagem para enviar",
        variant: "destructive"
      });
      return;
    }
    if (!user) return;
    try {
      const schedule = selectedScheduleForNotification;

      // Buscar informações do remetente (diretor ou coordenador)
      const {
        data: senderProfile
      } = await supabase.from('profiles').select('name, employee_role').eq('user_id', user.id).single();
      const isDirector = senderProfile?.employee_role === 'director';
      const notificationType = isDirector ? 'director_notification' : 'coordinator_notification';

      // Verificar se o usuário tem permissão
      if (!['director', 'coordinator_madre', 'coordinator_floresta', 'coordinator_atendimento_floresta'].includes(senderProfile?.employee_role || '')) {
        toast({
          title: "Sem permissão",
          description: "Apenas diretores e coordenadores podem enviar notificações",
          variant: "destructive"
        });
        return;
      }

      // Inserir notificação
      const {
        data: notificationData,
        error: notificationError
      } = await supabase.from('appointment_notifications').insert({
        schedule_id: schedule.id,
        employee_id: schedule.employee_id,
        client_id: schedule.client_id,
        title: notificationReason || 'Notificação da Coordenação',
        message: notificationMessage,
        appointment_date: schedule.start_time,
        appointment_time: format(new Date(schedule.start_time), 'HH:mm'),
        notification_type: notificationType,
        created_by: user.id,
        metadata: {
          status: schedule.status,
          sent_by: senderProfile?.name || 'Gestão',
          sender_role: senderProfile?.employee_role,
          reason: notificationReason
        }
      }).select().single();
      if (notificationError) {
        console.error('Erro ao criar notificação:', notificationError);
        throw new Error(`Falha ao criar notificação: ${notificationError.message || 'Erro desconhecido'}`);
      }

      // Criar mensagem interna automaticamente
      const messageBody = `🔔 **Notificação de Agendamento**

**Motivo:** ${notificationReason || 'Aviso sobre agendamento'}

**Paciente:** ${schedule.clients?.name || 'Não identificado'}
**Data/Hora:** ${format(new Date(schedule.start_time), "dd/MM/yyyy 'às' HH:mm", {
        locale: ptBR
      })}
**Status:** ${schedule.status === 'scheduled' ? 'Agendado' : schedule.status === 'confirmed' ? 'Confirmado' : schedule.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
**Unidade:** ${schedule.unit === 'madre' ? 'MADRE' : schedule.unit === 'floresta' ? 'Floresta' : schedule.unit === 'atendimento_floresta' ? 'Atendimento Floresta' : schedule.unit}

**Mensagem:**
${notificationMessage}

---
📅 Referência: Agendamento #${schedule.id.slice(0, 8)}
📧 Enviado por: ${senderProfile?.name}`;
      const {
        error: messageError
      } = await supabase.from('internal_messages').insert({
        sender_id: user.id,
        recipient_id: schedule.employee_id,
        subject: notificationReason || 'Notificação sobre Agendamento',
        message_body: messageBody,
        message_type: 'appointment_notification',
        priority: 'high',
        attachments: [{
          type: 'notification_metadata',
          schedule_id: schedule.id,
          notification_id: notificationData?.id,
          appointment_date: schedule.start_time,
          client_name: schedule.clients?.name
        }]
      });
      if (messageError) {
        console.error('Erro ao criar mensagem interna:', messageError);
        // Não bloqueia o fluxo principal
      }
      toast({
        title: "✅ Notificação enviada",
        description: `Mensagem enviada para ${schedule.profiles?.name} e salva em Mensagens Diretas`
      });
      setNotificationDialogOpen(false);
      setSelectedScheduleForNotification(null);
      setNotificationMessage("");
      setNotificationReason("");
    } catch (error) {
      console.error('Error sending notification:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: "Erro ao enviar notificação",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };
  useEffect(() => {
    loadUserProfile();
  }, [user]);
  useEffect(() => {
    if (userProfile) {
      loadEmployees();
      loadSchedules();
    }
  }, [userProfile, selectedDate, viewMode, selectedEmployee, selectedUnit]);
  const loadUserProfile = async () => {
    if (!user) return;
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };
  const loadEmployees = async () => {
    try {
      let query = supabase.from('profiles').select('user_id, id, name, employee_role').eq('is_active', true).order('name');
      const {
        data,
        error
      } = await query;
      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };
  const loadSchedules = async () => {
    setLoading(true);
    try {
      let startDate: Date;
      let endDate: Date;
      switch (viewMode) {
        case 'day':
          startDate = new Date(selectedDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(selectedDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'week':
          startDate = startOfWeek(selectedDate, {
            locale: ptBR
          });
          endDate = endOfWeek(selectedDate, {
            locale: ptBR
          });
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'month':
          startDate = startOfMonth(selectedDate);
          endDate = endOfMonth(selectedDate);
          endDate.setHours(23, 59, 59, 999);
          break;
      }
      let query = supabase.from('schedules').select(`
          *,
          clients (name),
          profiles:employee_id (name)
        `).gte('start_time', startDate.toISOString()).lt('start_time', endDate.toISOString()).order('start_time');

      // Filtros
      if (selectedEmployee !== 'all') {
        query = query.eq('employee_id', selectedEmployee);
      }
      if (selectedUnit !== 'all') {
        query = query.eq('unit', selectedUnit);
      }
      const {
        data,
        error
      } = await query;
      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error loading schedules:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os agendamentos."
      });
    } finally {
      setLoading(false);
    }
  };
  const navigateDate = (direction: 'prev' | 'next') => {
    switch (viewMode) {
      case 'day':
        setSelectedDate(direction === 'next' ? addDays(selectedDate, 1) : subDays(selectedDate, 1));
        break;
      case 'week':
        setSelectedDate(direction === 'next' ? addWeeks(selectedDate, 1) : subWeeks(selectedDate, 1));
        break;
      case 'month':
        setSelectedDate(direction === 'next' ? addMonths(selectedDate, 1) : subMonths(selectedDate, 1));
        break;
    }
  };
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, {
      label: string;
      variant: 'default' | 'secondary' | 'destructive' | 'outline';
      icon?: any;
    }> = {
      scheduled: {
        label: 'Agendado',
        variant: 'secondary',
        icon: Clock
      },
      confirmed: {
        label: 'Confirmado',
        variant: 'default',
        icon: CheckCircle2
      },
      completed: {
        label: 'Concluído',
        variant: 'outline',
        icon: CheckCircle2
      },
      cancelled: {
        label: 'Cancelado',
        variant: 'destructive',
        icon: XCircle
      },
      pending: {
        label: 'Pendente',
        variant: 'outline',
        icon: AlertCircle
      }
    };
    const config = statusConfig[status] || {
      label: status,
      variant: 'outline'
    };
    const Icon = config.icon;
    return <Badge variant={config.variant} className="flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {config.label}
      </Badge>;
  };
  const getDateRangeText = () => {
    switch (viewMode) {
      case 'day':
        return format(selectedDate, "dd 'de' MMMM 'de' yyyy", {
          locale: ptBR
        });
      case 'week':
        const weekStart = startOfWeek(selectedDate, {
          locale: ptBR
        });
        const weekEnd = endOfWeek(selectedDate, {
          locale: ptBR
        });
        return `${format(weekStart, 'dd/MM', {
          locale: ptBR
        })} - ${format(weekEnd, 'dd/MM/yyyy', {
          locale: ptBR
        })}`;
      case 'month':
        return format(selectedDate, "MMMM 'de' yyyy", {
          locale: ptBR
        });
    }
  };
  const generatePDF = (orientation: 'portrait' | 'landscape' = 'landscape') => {
    try {
      const doc = new jsPDF(orientation);
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Adicionar logo no cabeçalho
      try {
        // Converter logo para base64 e adicionar ao PDF
        const logoWidth = 30;
        const logoHeight = 18;
        doc.addImage(logoImage, 'PNG', 15, 5, logoWidth, logoHeight);
      } catch (error) {
        console.log('Erro ao carregar logo:', error);
      }

      // Título
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório de Agendamentos', pageWidth / 2, 12, {
        align: 'center'
      });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const filterText = `Período: ${getDateRangeText()} | Visualização: ${viewMode === 'day' ? 'Diária' : viewMode === 'week' ? 'Semanal' : 'Mensal'}`;
      doc.text(filterText, pageWidth / 2, 25, {
        align: 'center'
      });

      // Informações de filtro
      let filterInfo = [];
      if (selectedEmployee !== 'all') {
        const emp = employees.find(e => e.user_id === selectedEmployee);
        filterInfo.push(`Profissional: ${emp?.name || 'N/A'}`);
      }
      if (selectedUnit !== 'all') {
        filterInfo.push(`Unidade: ${selectedUnit === 'madre' ? 'MADRE' : selectedUnit === 'floresta' ? 'Floresta' : selectedUnit === 'atendimento_floresta' ? 'Atendimento Floresta' : selectedUnit}`);
      }
      if (filterInfo.length > 0) {
        doc.setFontSize(9);
        doc.text(filterInfo.join(' | '), pageWidth / 2, 31, {
          align: 'center'
        });
      }
      if (viewMode === 'week') {
        // Layout Semanal - Visualização Horizontal com Paginação
        const weekStart = startOfWeek(selectedDate, {
          locale: ptBR
        });
        const weekDays = Array.from({
          length: 7
        }, (_, i) => addDays(weekStart, i));
        const workDays = weekDays.slice(1, 6); // Segunda a Sexta

        const colWidth = (pageWidth - 30) / 5;
        const headerHeight = 10;
        const cardHeight = 25;
        const cardSpacing = 2;
        const maxY = pageHeight - 35;
        const startY = filterInfo.length > 0 ? 38 : 32;

        // Função auxiliar para desenhar cabeçalho
        const drawWeekHeader = (yPosition: number) => {
          workDays.forEach((day, index) => {
            const x = 15 + index * colWidth;
            doc.setFillColor(59, 130, 246);
            doc.rect(x, yPosition, colWidth, headerHeight, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            const dayText = format(day, 'EEEE', {
              locale: ptBR
            });
            const dateText = format(day, 'dd/MM');
            doc.text(dayText.toUpperCase(), x + colWidth / 2, yPosition + 4, {
              align: 'center'
            });
            doc.setFontSize(8);
            doc.text(dateText, x + colWidth / 2, yPosition + 8, {
              align: 'center'
            });
          });
        };

        // Agrupar agendamentos por dia
        const schedulesPerDay = workDays.map(day => ({
          day,
          schedules: schedules.filter(s => isSameDay(new Date(s.start_time), day)).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        }));

        // Função para desenhar um card de agendamento
        const drawScheduleCard = (schedule: any, x: number, y: number) => {
          // Cor de fundo baseada no status
          if (schedule.status === 'completed') {
            doc.setFillColor(220, 252, 231);
          } else if (schedule.status === 'cancelled') {
            doc.setFillColor(254, 226, 226);
          } else if (schedule.status === 'confirmed') {
            doc.setFillColor(219, 234, 254);
          } else {
            doc.setFillColor(250, 250, 250);
          }
          doc.rect(x + 1, y, colWidth - 2, cardHeight, 'F');
          doc.setDrawColor(200, 200, 200);
          doc.rect(x + 1, y, colWidth - 2, cardHeight, 'S');

          // Conteúdo do card
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text(`${format(new Date(schedule.start_time), 'HH:mm')}`, x + 3, y + 5);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          const patientName = schedule.clients?.name || 'N/A';
          const truncatedName = patientName.length > 18 ? patientName.substring(0, 18) + '...' : patientName;
          doc.text(truncatedName, x + 3, y + 10);
          const profName = schedule.profiles?.name || 'N/A';
          const truncatedProf = profName.length > 18 ? profName.substring(0, 18) + '...' : profName;
          doc.text(truncatedProf, x + 3, y + 15);
          doc.setFontSize(7);
          const statusText = schedule.status === 'scheduled' ? 'Agendado' : schedule.status === 'confirmed' ? 'Confirmado' : schedule.status === 'completed' ? 'Concluído' : schedule.status === 'cancelled' ? 'Cancelado' : 'Pendente';
          doc.text(statusText, x + 3, y + 20);
        };

        // Inicializar primeira página
        drawWeekHeader(startY);

        // Encontrar o número máximo de agendamentos em qualquer dia
        const maxSchedules = Math.max(...schedulesPerDay.map(d => d.schedules.length), 1);

        // Renderizar agendamentos linha por linha
        let currentPageY = startY + headerHeight + 2;
        for (let rowIndex = 0; rowIndex < maxSchedules; rowIndex++) {
          // Verificar se precisa de nova página
          if (currentPageY + cardHeight > maxY) {
            doc.addPage();
            drawWeekHeader(15);
            currentPageY = 15 + headerHeight + 2;
          }

          // Desenhar agendamentos desta linha para cada dia
          let hasAnySchedule = false;
          schedulesPerDay.forEach((dayData, dayIndex) => {
            const x = 15 + dayIndex * colWidth;
            const schedule = dayData.schedules[rowIndex];
            if (schedule) {
              drawScheduleCard(schedule, x, currentPageY);
              hasAnySchedule = true;
            } else if (rowIndex === 0 && dayData.schedules.length === 0) {
              // Mostrar "Sem agendamentos" apenas na primeira linha se não houver nenhum
              doc.setFontSize(8);
              doc.setTextColor(150, 150, 150);
              doc.text('Sem agendamentos', x + colWidth / 2, currentPageY + 5, {
                align: 'center'
              });
              doc.setTextColor(0, 0, 0);
            }
          });

          // Avançar para a próxima linha somente se houver algum agendamento
          if (hasAnySchedule || rowIndex === 0) {
            currentPageY += cardHeight + cardSpacing;
          }
        }
      } else if (viewMode === 'month') {
        // Layout Mensal - Calendário Visual
        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);
        const calendarStart = startOfWeek(monthStart, {
          locale: ptBR
        });
        const calendarEnd = endOfWeek(monthEnd, {
          locale: ptBR
        });
        const totalDays = Math.ceil((calendarEnd.getTime() - calendarStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const weeks = Math.ceil(totalDays / 7);
        const cellWidth = (pageWidth - 30) / 7;
        const cellHeight = (pageHeight - 70) / weeks;
        const monthStartY = filterInfo.length > 0 ? 38 : 32;

        // Cabeçalho dos dias da semana
        const weekDaysNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        weekDaysNames.forEach((dayName, index) => {
          const x = 15 + index * cellWidth;
          doc.setFillColor(59, 130, 246);
          doc.rect(x, monthStartY, cellWidth, 8, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(dayName, x + cellWidth / 2, monthStartY + 6, {
            align: 'center'
          });
        });

        // Desenhar calendário
        let currentDay = calendarStart;
        let currentY = monthStartY + 8;
        for (let week = 0; week < weeks; week++) {
          for (let day = 0; day < 7; day++) {
            const x = 15 + day * cellWidth;
            const y = currentY;
            doc.setDrawColor(200, 200, 200);
            doc.rect(x, y, cellWidth, cellHeight, 'S');
            const isCurrentMonth = isSameMonth(currentDay, selectedDate);
            doc.setTextColor(isCurrentMonth ? 0 : 150);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text(format(currentDay, 'd'), x + 2, y + 5);
            const daySchedules = schedules.filter(s => isSameDay(new Date(s.start_time), currentDay)).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
            let schedY = y + 8;
            daySchedules.slice(0, 4).forEach(schedule => {
              let statusColor: [number, number, number] = [200, 200, 200];
              if (schedule.status === 'completed') statusColor = [34, 197, 94];else if (schedule.status === 'cancelled') statusColor = [239, 68, 68];else if (schedule.status === 'confirmed') statusColor = [59, 130, 246];else if (schedule.status === 'scheduled') statusColor = [250, 204, 21];
              doc.setFillColor(...statusColor);
              doc.circle(x + 2, schedY, 0.8, 'F');
              doc.setFontSize(6);
              doc.setTextColor(0, 0, 0);
              doc.setFont('helvetica', 'normal');
              const timeText = format(new Date(schedule.start_time), 'HH:mm');
              doc.text(timeText, x + 4, schedY + 1);
              schedY += 3;
            });
            if (daySchedules.length > 4) {
              doc.setFontSize(6);
              doc.setTextColor(100, 100, 100);
              doc.text(`+${daySchedules.length - 4}`, x + 2, schedY + 1);
            }
            currentDay = addDays(currentDay, 1);
          }
          currentY += cellHeight;
        }

        // Adicionar página com lista completa de agendamentos
        if (schedules.length > 0) {
          doc.addPage();
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text('Lista Completa de Agendamentos', pageWidth / 2, 15, {
            align: 'center'
          });
          const tableData = schedules.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()).map(schedule => [format(new Date(schedule.start_time), 'dd/MM/yyyy', {
            locale: ptBR
          }), `${format(new Date(schedule.start_time), 'HH:mm')} - ${format(new Date(schedule.end_time), 'HH:mm')}`, schedule.clients?.name || 'N/A', schedule.profiles?.name || 'N/A', schedule.unit === 'madre' ? 'MADRE' : schedule.unit === 'floresta' ? 'Floresta' : schedule.unit === 'atendimento_floresta' ? 'Atendimento Floresta' : schedule.unit, schedule.status === 'scheduled' ? 'Agendado' : schedule.status === 'confirmed' ? 'Confirmado' : schedule.status === 'completed' ? 'Concluído' : schedule.status === 'cancelled' ? 'Cancelado' : 'Pendente']);
          autoTable(doc, {
            startY: 22,
            head: [['Data', 'Horário', 'Paciente', 'Profissional', 'Unidade', 'Status']],
            body: tableData,
            styles: {
              fontSize: 8,
              cellPadding: 2.5
            },
            headStyles: {
              fillColor: [59, 130, 246],
              textColor: 255,
              fontStyle: 'bold'
            },
            alternateRowStyles: {
              fillColor: [245, 245, 245]
            },
            margin: {
              left: 15,
              right: 15
            }
          });
        }
      } else {
        // Layout Diário - Tabela tradicional
        const dayStartY = filterInfo.length > 0 ? 38 : 32;
        const tableData = schedules.map(schedule => [`${format(new Date(schedule.start_time), 'HH:mm')} - ${format(new Date(schedule.end_time), 'HH:mm')}`, schedule.clients?.name || 'N/A', schedule.profiles?.name || 'N/A', schedule.unit === 'madre' ? 'MADRE' : schedule.unit === 'floresta' ? 'Floresta' : schedule.unit === 'atendimento_floresta' ? 'Atendimento Floresta' : schedule.unit, schedule.status === 'scheduled' ? 'Agendado' : schedule.status === 'confirmed' ? 'Confirmado' : schedule.status === 'completed' ? 'Concluído' : schedule.status === 'cancelled' ? 'Cancelado' : 'Pendente']);
        autoTable(doc, {
          startY: dayStartY,
          head: [['Horário', 'Paciente', 'Profissional', 'Unidade', 'Status']],
          body: tableData,
          styles: {
            fontSize: 9,
            cellPadding: 3
          },
          headStyles: {
            fillColor: [59, 130, 246],
            textColor: 255,
            fontStyle: 'bold'
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245]
          },
          margin: {
            top: dayStartY,
            left: 15,
            right: 15
          }
        });
      }

      // Rodapé
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128);
        doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 15, pageHeight - 8);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 15, pageHeight - 8, {
          align: 'right'
        });
      }

      // Salvar PDF
      const fileName = `Relatorio_Agendamentos_${format(selectedDate, 'yyyy-MM-dd')}_${viewMode}.pdf`;
      doc.save(fileName);
      toast({
        title: "PDF gerado com sucesso",
        description: `Relatório baixado: ${fileName}`
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o relatório. Tente novamente.",
        variant: "destructive"
      });
    }
  };
  const groupSchedulesByDate = () => {
    const grouped: Record<string, Schedule[]> = {};
    schedules.forEach(schedule => {
      const dateKey = format(new Date(schedule.start_time), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(schedule);
    });
    return grouped;
  };
  const renderDayView = () => {
    // Agrupar agendamentos por hora
    const schedulesByHour: Record<string, Schedule[]> = {};
    schedules.forEach(schedule => {
      const hour = format(new Date(schedule.start_time), 'HH:00');
      if (!schedulesByHour[hour]) {
        schedulesByHour[hour] = [];
      }
      schedulesByHour[hour].push(schedule);
    });
    const sortedHours = Object.keys(schedulesByHour).sort();

    // Estatísticas do dia
    const dayStats = {
      total: schedules.length,
      confirmed: schedules.filter(s => s.status === 'confirmed').length,
      scheduled: schedules.filter(s => s.status === 'scheduled').length,
      cancelled: schedules.filter(s => s.status === 'cancelled').length
    };
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'confirmed':
          return 'border-l-emerald-500 bg-emerald-500/5';
        case 'scheduled':
          return 'border-l-blue-500 bg-blue-500/5';
        case 'cancelled':
          return 'border-l-red-500 bg-red-500/5';
        case 'completed':
          return 'border-l-slate-400 bg-slate-400/5';
        default:
          return 'border-l-amber-500 bg-amber-500/5';
      }
    };
    const getPeriod = (hour: string) => {
      const h = parseInt(hour.split(':')[0]);
      if (h < 12) return 'morning';
      if (h < 18) return 'afternoon';
      return 'evening';
    };
    let lastPeriod = '';
    return <div className="space-y-6">
        {/* Cards de Resumo do Dia */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{dayStats.total}</div>
              <div className="text-sm text-muted-foreground font-medium">Total</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{dayStats.confirmed}</div>
              <div className="text-sm text-muted-foreground font-medium">Confirmados</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{dayStats.scheduled}</div>
              <div className="text-sm text-muted-foreground font-medium">Agendados</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">{dayStats.cancelled}</div>
              <div className="text-sm text-muted-foreground font-medium">Cancelados</div>
            </CardContent>
          </Card>
        </div>

        {schedules.length === 0 ? <Card className="border-dashed border-2">
            <CardContent className="p-12 text-center">
              <CalendarIcon className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">Nenhum agendamento</h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Não há agendamentos para {format(selectedDate, "dd 'de' MMMM", {
              locale: ptBR
            })}
              </p>
            </CardContent>
          </Card> : <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-[23px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-purple-500/50 via-purple-400/30 to-transparent" />
            
            <div className="space-y-6">
              {sortedHours.map((hour, hourIndex) => {
            const currentPeriod = getPeriod(hour);
            const showPeriodHeader = currentPeriod !== lastPeriod;
            lastPeriod = currentPeriod;
            return <div key={hour} className="animate-fade-in" style={{
              animationDelay: `${hourIndex * 50}ms`
            }}>
                    {/* Period Separator */}
                    {showPeriodHeader && <div className="flex items-center gap-3 mb-4 ml-12">
                        <div className={cn("px-4 py-1.5 rounded-full text-sm font-semibold", currentPeriod === 'morning' && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", currentPeriod === 'afternoon' && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", currentPeriod === 'evening' && "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400")}>
                          {currentPeriod === 'morning' ? '☀️ Manhã' : currentPeriod === 'afternoon' ? '🌤️ Tarde' : '🌙 Noite'}
                        </div>
                        <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
                      </div>}

                    {/* Hour Marker */}
                    <div className="flex items-start gap-4">
                      <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/25">
                        <span className="text-sm font-bold">{hour.split(':')[0]}</span>
                      </div>

                      <div className="flex-1 space-y-3">
                        {schedulesByHour[hour].map((schedule, scheduleIndex) => <Card key={schedule.id} className={cn("border-l-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.01] group", getStatusColor(schedule.status))} style={{
                    animationDelay: `${hourIndex * 50 + scheduleIndex * 30}ms`
                  }}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-3">
                                  {/* Time */}
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10">
                                      <Clock className="h-4 w-4 text-primary" />
                                      <span className="font-bold text-primary">
                                        {format(new Date(schedule.start_time), 'HH:mm')} - {format(new Date(schedule.end_time), 'HH:mm')}
                                      </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                      {Math.round((new Date(schedule.end_time).getTime() - new Date(schedule.start_time).getTime()) / 60000)} min
                                    </span>
                                  </div>
                                  
                                  {/* Patient */}
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold shadow-md">
                                      {(schedule.clients?.name || 'P')[0].toUpperCase()}
                                    </div>
                                    <div>
                                      <button onClick={() => handleClientClick(schedule.client_id)} className="font-semibold text-base hover:text-primary transition-colors">
                                        {schedule.clients?.name || 'Paciente não identificado'}
                                      </button>
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <User className="h-3.5 w-3.5" />
                                        <span>{schedule.profiles?.name || 'Profissional não atribuído'}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Unit Badge */}
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <Badge variant={schedule.unit === 'madre' ? 'default' : schedule.unit === 'floresta' ? 'secondary' : 'outline'} className="font-medium">
                                      {schedule.unit === 'madre' ? 'MADRE' : schedule.unit === 'floresta' ? 'Floresta' : schedule.unit === 'atendimento_floresta' ? 'Atendimento Floresta' : schedule.unit || 'N/A'}
                                    </Badge>
                                    {schedule.title && <Badge variant="outline" className="bg-background">
                                        {schedule.title}
                                      </Badge>}
                                  </div>

                                  {/* Notes & Cancellation */}
                                  {schedule.notes && <div className="text-sm bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                                      <span className="font-medium text-blue-700 dark:text-blue-300">Observações:</span>{' '}
                                      <span className="text-blue-600 dark:text-blue-400">{schedule.notes}</span>
                                    </div>}

                                  {schedule.status === 'cancelled' && schedule.cancellation_reason && <div className="text-sm bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200/50 dark:border-red-800/50">
                                      <span className="font-medium text-red-700 dark:text-red-300">Motivo do cancelamento:</span>{' '}
                                      <span className="text-red-600 dark:text-red-400">{schedule.cancellation_reason}</span>
                                    </div>}
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                  {getStatusBadge(schedule.status)}
                                  {schedule.patient_arrived && <Badge variant="outline" className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Paciente chegou
                                    </Badge>}
                                  
                                  {/* Notification Button */}
                                  {(userProfile?.employee_role === 'director' || userProfile?.employee_role === 'coordinator_madre' || userProfile?.employee_role === 'coordinator_floresta') && <Button size="sm" variant="outline" onClick={() => handleOpenNotificationDialog(schedule)} className="gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                                      <Bell className="h-3 w-3" />
                                      Notificar
                                    </Button>}
                                </div>
                              </div>
                            </CardContent>
                          </Card>)}
                      </div>
                    </div>
                  </div>;
          })}
            </div>
          </div>}
      </div>;
  };
  const renderWeekView = () => {
    const groupedSchedules = groupSchedulesByDate();
    const weekStart = startOfWeek(selectedDate, {
      locale: ptBR
    });
    const weekDays = Array.from({
      length: 7
    }, (_, i) => addDays(weekStart, i));
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'confirmed':
          return 'bg-emerald-500';
        case 'scheduled':
          return 'bg-blue-500';
        case 'cancelled':
          return 'bg-red-500';
        case 'completed':
          return 'bg-slate-400';
        default:
          return 'bg-amber-500';
      }
    };
    const getStatusBg = (status: string) => {
      switch (status) {
        case 'confirmed':
          return 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800';
        case 'scheduled':
          return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
        case 'cancelled':
          return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
        case 'completed':
          return 'bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800';
        default:
          return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
      }
    };
    const getUnitStyle = (unit: string) => {
      switch (unit) {
        case 'madre':
          return 'bg-blue-600 text-white';
        case 'floresta':
          return 'bg-emerald-600 text-white';
        case 'atendimento_floresta':
          return 'bg-teal-600 text-white';
        default:
          return 'bg-slate-500 text-white';
      }
    };
    return <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {weekDays.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const daySchedules = groupedSchedules[dateKey] || [];
        const isToday = isSameDay(day, new Date());
        const sortedSchedules = [...daySchedules].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        return <div key={dateKey} className="flex flex-col">
              {/* Header do dia */}
              <div className={cn("rounded-t-xl p-3 text-center border-b-2", isToday ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-primary" : "bg-muted/50 border-border")}>
                <p className={cn("text-xs font-medium uppercase tracking-wide", isToday ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {format(day, "EEEE", {
                locale: ptBR
              })}
                </p>
                <p className={cn("text-lg font-bold", isToday ? "text-primary-foreground" : "text-foreground")}>
                  {format(day, "dd/MM", {
                locale: ptBR
              })}
                </p>
              </div>
              
              {/* Lista de agendamentos */}
              <div className={cn("flex-1 rounded-b-xl border border-t-0 p-2 space-y-2 min-h-[200px] max-h-[600px] overflow-y-auto", isToday ? "border-primary/30 bg-primary/5" : "border-border bg-card")}>
                {sortedSchedules.length === 0 ? <p className="text-xs text-muted-foreground text-center py-8 italic">
                    Sem agendamentos
                  </p> : sortedSchedules.map(schedule => <div key={schedule.id} className={cn("relative rounded-lg border p-2.5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer group", getStatusBg(schedule.status))}>
                      {/* Indicador de status lateral */}
                      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-lg", getStatusColor(schedule.status))} />
                      
                      <div className="pl-2 space-y-1.5">
                        {/* Horário e Status */}
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            <span className="text-sm font-bold text-foreground">
                              {format(new Date(schedule.start_time), 'HH:mm')}
                            </span>
                          </div>
                          <Badge variant={schedule.status === 'cancelled' ? 'destructive' : schedule.status === 'confirmed' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0 h-5">
                            {schedule.status === 'scheduled' ? 'Agend.' : schedule.status === 'confirmed' ? 'Conf.' : schedule.status === 'cancelled' ? 'Canc.' : schedule.status === 'completed' ? 'Conc.' : schedule.status}
                          </Badge>
                        </div>
                        
                        {/* Nome do paciente */}
                        <button onClick={() => handleClientClick(schedule.client_id)} className="text-left w-full font-semibold text-xs text-foreground hover:text-primary transition-colors line-clamp-2 leading-tight">
                          {schedule.clients?.name || 'Paciente não identificado'}
                        </button>
                        
                        {/* Profissional */}
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <User className="h-3 w-3 shrink-0" />
                          <span className="text-[10px] truncate font-medium">
                            {schedule.profiles?.name || 'Não atribuído'}
                          </span>
                        </div>

                        {/* Unidade */}
                        <Badge className={cn("text-[9px] px-1.5 py-0.5 font-semibold", getUnitStyle(schedule.unit || ''))}>
                          {schedule.unit === 'madre' ? 'MADRE' : schedule.unit === 'floresta' ? 'Floresta' : schedule.unit === 'atendimento_floresta' ? 'Atend. Floresta' : schedule.unit || 'N/A'}
                        </Badge>
                        
                        {/* Botão de notificação - aparece no hover */}
                        {(userProfile?.employee_role === 'director' || userProfile?.employee_role === 'coordinator_madre' || userProfile?.employee_role === 'coordinator_floresta') && <Button size="sm" variant="outline" onClick={e => {
                  e.stopPropagation();
                  handleOpenNotificationDialog(schedule);
                }} className="w-full h-6 text-[10px] gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80">
                            <Bell className="h-3 w-3" />
                            Notificar
                          </Button>}
                      </div>
                    </div>)}
              </div>
            </div>;
      })}
      </div>;
  };
  const renderMonthView = () => {
    const groupedSchedules = groupSchedulesByDate();
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const startDate = startOfWeek(monthStart, {
      locale: ptBR
    });
    const endDate = endOfWeek(monthEnd, {
      locale: ptBR
    });

    // Generate all days for the calendar grid
    const calendarDays: Date[] = [];
    let currentDay = startDate;
    while (currentDay <= endDate) {
      calendarDays.push(currentDay);
      currentDay = addDays(currentDay, 1);
    }

    // Split into weeks
    const weeks: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const getSchedulesForDay = (date: Date) => {
      const dateKey = format(date, 'yyyy-MM-dd');
      return groupedSchedules[dateKey] || [];
    };
    const getStatusDot = (status: string) => {
      switch (status) {
        case 'confirmed':
          return 'bg-emerald-500';
        case 'scheduled':
          return 'bg-blue-500';
        case 'cancelled':
          return 'bg-red-500';
        case 'completed':
          return 'bg-slate-400';
        default:
          return 'bg-amber-500';
      }
    };

    // Month Stats
    const monthStats = {
      total: schedules.length,
      confirmed: schedules.filter(s => s.status === 'confirmed').length,
      scheduled: schedules.filter(s => s.status === 'scheduled').length,
      cancelled: schedules.filter(s => s.status === 'cancelled').length
    };
    return <div className="space-y-6">
        {/* Month Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{monthStats.total}</div>
              <div className="text-sm text-muted-foreground font-medium">Total do Mês</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{monthStats.confirmed}</div>
              <div className="text-sm text-muted-foreground font-medium">Confirmados</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{monthStats.scheduled}</div>
              <div className="text-sm text-muted-foreground font-medium">Agendados</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">{monthStats.cancelled}</div>
              <div className="text-sm text-muted-foreground font-medium">Cancelados</div>
            </CardContent>
          </Card>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Confirmado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">Agendado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-muted-foreground">Cancelado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">Pendente</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <Card className="overflow-hidden border-0 shadow-xl">
          <CardContent className="p-0">
            {/* Week Days Header */}
            <div className="grid grid-cols-7 bg-gradient-to-r from-purple-600 to-purple-500 text-white">
              {weekDays.map((day, index) => <div key={day} className={cn("py-3 text-center font-semibold text-sm", index === 0 && "text-red-200", index === 6 && "text-red-200")}>
                  {day}
                </div>)}
            </div>

            {/* Calendar Days */}
            <div className="divide-y divide-border">
              {weeks.map((week, weekIndex) => <div key={weekIndex} className="grid grid-cols-7 divide-x divide-border">
                  {week.map((day, dayIndex) => {
                const daySchedules = getSchedulesForDay(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, selectedDate);
                const hasSchedules = daySchedules.length > 0;
                return <Popover key={dayIndex}>
                        <PopoverTrigger asChild>
                          <div className={cn("min-h-[100px] p-2 cursor-pointer transition-all duration-200 hover:bg-muted/50", !isCurrentMonth && "bg-muted/30 opacity-50", isToday && "bg-gradient-to-br from-purple-500/10 to-purple-600/5 ring-2 ring-purple-500/30", hasSchedules && "hover:shadow-inner")}>
                            {/* Day Number */}
                            <div className={cn("flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold mb-2", isToday && "bg-purple-600 text-white shadow-lg", !isToday && dayIndex === 0 && "text-red-500", !isToday && dayIndex === 6 && "text-red-500", !isCurrentMonth && "text-muted-foreground")}>
                              {format(day, 'd')}
                            </div>

                            {/* Schedule Indicators */}
                            {hasSchedules && <div className="space-y-1">
                                {/* Status Dots */}
                                <div className="flex flex-wrap gap-1 mb-1">
                                  {daySchedules.slice(0, 6).map((schedule, i) => <div key={i} className={cn("w-2 h-2 rounded-full", getStatusDot(schedule.status))} />)}
                                  {daySchedules.length > 6 && <span className="text-[10px] text-muted-foreground">+{daySchedules.length - 6}</span>}
                                </div>

                                {/* Preview of first schedules */}
                                <div className="space-y-0.5">
                                  {daySchedules.slice(0, 2).map((schedule, i) => <div key={i} className={cn("text-[10px] px-1.5 py-0.5 rounded truncate border-l-2", schedule.status === 'confirmed' && "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700 dark:text-emerald-300", schedule.status === 'scheduled' && "bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300", schedule.status === 'cancelled' && "bg-red-100 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-300 line-through", !['confirmed', 'scheduled', 'cancelled'].includes(schedule.status) && "bg-amber-100 dark:bg-amber-900/30 border-amber-500 text-amber-700 dark:text-amber-300")}>
                                      {format(new Date(schedule.start_time), 'HH:mm')} {schedule.clients?.name?.split(' ')[0]}
                                    </div>)}
                                  {daySchedules.length > 2 && <div className="text-[10px] text-muted-foreground font-medium px-1.5">
                                      +{daySchedules.length - 2} mais
                                    </div>}
                                </div>
                              </div>}
                          </div>
                        </PopoverTrigger>
                        
                        {/* Day Detail Popover */}
                        {hasSchedules && <PopoverContent className="w-80 p-0" align="start">
                            <div className="bg-gradient-to-r from-purple-600 to-purple-500 text-white p-3 rounded-t-lg">
                              <div className="font-semibold">
                                {format(day, "EEEE, dd 'de' MMMM", {
                          locale: ptBR
                        })}
                              </div>
                              <div className="text-sm text-purple-100">
                                {daySchedules.length} agendamento{daySchedules.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                            <div className="max-h-64 overflow-y-auto p-2 space-y-2">
                              {daySchedules.map(schedule => <div key={schedule.id} className={cn("p-2 rounded-lg border-l-4 text-sm", schedule.status === 'confirmed' && "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500", schedule.status === 'scheduled' && "bg-blue-50 dark:bg-blue-900/20 border-blue-500", schedule.status === 'cancelled' && "bg-red-50 dark:bg-red-900/20 border-red-500", !['confirmed', 'scheduled', 'cancelled'].includes(schedule.status) && "bg-amber-50 dark:bg-amber-900/20 border-amber-500")}>
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold">
                                      {format(new Date(schedule.start_time), 'HH:mm')} - {format(new Date(schedule.end_time), 'HH:mm')}
                                    </span>
                                    {getStatusBadge(schedule.status)}
                                  </div>
                                  <button onClick={() => handleClientClick(schedule.client_id)} className="font-medium hover:text-primary transition-colors truncate block mt-1">
                                    {schedule.clients?.name || 'Paciente'}
                                  </button>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {schedule.profiles?.name || 'Profissional'}
                                  </div>
                                  {(userProfile?.employee_role === 'director' || userProfile?.employee_role === 'coordinator_madre' || userProfile?.employee_role === 'coordinator_floresta') && <Button size="sm" variant="outline" onClick={() => handleOpenNotificationDialog(schedule)} className="w-full mt-2 h-7 text-xs gap-1">
                                      <Bell className="h-3 w-3" />
                                      Notificar Profissional
                                    </Button>}
                                </div>)}
                            </div>
                          </PopoverContent>}
                      </Popover>;
              })}
                </div>)}
            </div>
          </CardContent>
        </Card>
      </div>;
  };
  return <div className="container mx-auto p-6 space-y-6">
      {/* Cabeçalho Moderno */}
      <div className="flex flex-col gap-4 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative">
            <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 via-purple-600 to-purple-700 rounded-full" />
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-purple-600 via-purple-500 to-purple-400 bg-clip-text text-transparent">
              Controle de Agendamentos
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie agendamentos, confirme consultas e monitore presença
            </p>
          </div>
          <Badge className="text-lg px-6 py-3 w-fit bg-gradient-to-r from-purple-500/10 to-purple-600/10 text-purple-700 dark:text-purple-400 border-purple-500/20">
            <CalendarIcon className="h-4 w-4 mr-2" />
            {schedules.length} agendamento{schedules.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Filtros e navegação - Card Moderno */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-purple-500/5 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent pointer-events-none" />
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Seletor de visualização */}
              <Tabs value={viewMode} onValueChange={value => setViewMode(value as ViewMode)} className="flex-1">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="day">Dia</TabsTrigger>
                  <TabsTrigger value="week">Semana</TabsTrigger>
                  <TabsTrigger value="month">Mês</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Navegação de data */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal w-[240px]")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {getDateRangeText()}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={selectedDate} onSelect={date => date && setSelectedDate(date)} initialFocus locale={ptBR} />
                  </PopoverContent>
                </Popover>

                <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Filtros */}
              <div className="flex gap-2">
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Todos os profissionais" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os profissionais</SelectItem>
                    {employees.map(emp => <SelectItem key={emp.user_id} value={emp.user_id}>
                        {emp.name}
                      </SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Todas as unidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as unidades</SelectItem>
                    <SelectItem value="madre">MADRE (Clínica Social)</SelectItem>
                    <SelectItem value="floresta">Floresta (Neuroavaliação)</SelectItem>
                    <SelectItem value="atendimento_floresta">Atendimento Floresta</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={() => setPdfConfigDialogOpen(true)} variant="outline" className="gap-2" disabled={schedules.length === 0}>
                  <Download className="h-4 w-4" />
                  Baixar PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        

        {/* Conteúdo principal */}
        {loading ? <Card>
            <CardContent className="p-8 text-center">
              Carregando agendamentos...
            </CardContent>
          </Card> : <>
            {viewMode === 'day' && renderDayView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'month' && renderMonthView()}
          </>}
      </div>

      {/* Dialog de Detalhes do Cliente */}
      <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Paciente</DialogTitle>
          </DialogHeader>
          {selectedClient && <ClientDetailsView client={selectedClient} onEdit={() => {
          // Recarregar dados do cliente após edição
          if (selectedClient?.id) {
            handleClientClick(selectedClient.id);
          }
        }} onBack={() => setIsClientDialogOpen(false)} onRefresh={() => {
          // Recarregar agendamentos após atualização
          loadSchedules();
          if (selectedClient?.id) {
            handleClientClick(selectedClient.id);
          }
        }} />}
        </DialogContent>
      </Dialog>

      {/* Dialog de Notificação Personalizada */}
      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notificar Profissional</DialogTitle>
          </DialogHeader>
          
          {selectedScheduleForNotification && <div className="space-y-4 py-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="text-sm">
                  <span className="font-semibold">Paciente:</span> {selectedScheduleForNotification.clients?.name}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Profissional:</span>{" "}
                  {selectedScheduleForNotification.profiles?.name}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Data/Hora:</span>{" "}
                  {format(new Date(selectedScheduleForNotification.start_time), "dd/MM/yyyy 'às' HH:mm", {
                locale: ptBR
              })}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Status:</span>{" "}
                  {getStatusBadge(selectedScheduleForNotification.status)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notification-reason">Motivo da Notificação</Label>
                <Select value={notificationReason} onValueChange={setNotificationReason}>
                  <SelectTrigger id="notification-reason">
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Solicitação de Finalização">Solicitar finalização do atendimento</SelectItem>
                    <SelectItem value="Solicitar Informações">Solicitar informações adicionais</SelectItem>
                    <SelectItem value="Esclarecer Cancelamento">Esclarecer motivo do cancelamento</SelectItem>
                    <SelectItem value="Confirmação de Presença">Confirmar presença do paciente</SelectItem>
                    <SelectItem value="Atualização de Dados">Solicitar atualização de dados</SelectItem>
                    <SelectItem value="Verificação de Status">Verificar status do atendimento</SelectItem>
                    <SelectItem value="Outro">Outro motivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notification-message">Mensagem *</Label>
                <Textarea id="notification-message" placeholder="Escreva sua mensagem aqui... Seja claro sobre o que precisa que o profissional faça." value={notificationMessage} onChange={e => setNotificationMessage(e.target.value)} rows={6} maxLength={500} className="resize-none" />
                <p className="text-xs text-muted-foreground">
                  {notificationMessage.length}/500 caracteres
                </p>
              </div>

              {selectedScheduleForNotification.status === 'cancelled' && <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
                  <p className="text-sm text-destructive font-medium">
                    ⚠️ Atendimento Cancelado
                  </p>
                  {selectedScheduleForNotification.cancellation_reason && <p className="text-xs text-muted-foreground mt-1">
                      Motivo: {selectedScheduleForNotification.cancellation_reason}
                    </p>}
                </div>}

              {selectedScheduleForNotification.status === 'confirmed' && <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-3 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                    ✓ Atendimento Confirmado
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    O profissional já confirmou este atendimento
                  </p>
                </div>}
            </div>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setNotificationDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSendNotification} disabled={!notificationMessage.trim()}>
              <Bell className="h-4 w-4 mr-2" />
              Enviar Notificação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Configuração do PDF */}
      <Dialog open={pdfConfigDialogOpen} onOpenChange={setPdfConfigDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Relatório PDF</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Orientação do PDF</Label>
              <Select value={pdfOrientation} onValueChange={(value: 'portrait' | 'landscape') => setPdfOrientation(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="landscape">Paisagem (Horizontal)</SelectItem>
                  <SelectItem value="portrait">Retrato (Vertical)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
              <p className="font-medium mb-1">Preview:</p>
              <p>• Orientação: {pdfOrientation === 'landscape' ? 'Paisagem' : 'Retrato'}</p>
              <p>• Total de agendamentos: {schedules.length}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPdfConfigDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
            generatePDF(pdfOrientation);
            setPdfConfigDialogOpen(false);
          }} className="gap-2">
              <Download className="h-4 w-4" />
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}