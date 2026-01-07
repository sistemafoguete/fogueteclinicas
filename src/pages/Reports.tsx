import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useCustomPermissions } from '@/hooks/useCustomPermissions';
import { FileText, Users, Calendar, Star, TrendingUp, Download, Filter, Search, BarChart3, Clock, Shield, Trash2, Eye, X, FileDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Combobox } from '@/components/ui/combobox';
import { DeleteFinancialRecordsDialog } from '@/components/DeleteFinancialRecordsDialog';
import jsPDF from 'jspdf';

interface EmployeeReport {
  id: string;
  employee_id: string;
  client_id: string;
  session_date: string;
  session_type: string;
  session_duration?: number;
  effort_rating?: number;
  quality_rating?: number;
  patient_cooperation?: number;
  goal_achievement?: number;
  session_objectives?: string;
  techniques_used?: string;
  patient_response?: string;
  professional_notes?: string;
  materials_cost: number;
  clients?: { name: string };
  profiles?: { name: string };
}

interface Profile {
  id: string;
  user_id: string;
  name: string;
  employee_role: string;
}

export default function Reports() {
  const [attendanceReports, setAttendanceReports] = useState<any[]>([]);
  const [employeeReports, setEmployeeReports] = useState<EmployeeReport[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [sessionType, setSessionType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isDeleteFinancialDialogOpen, setIsDeleteFinancialDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const { user } = useAuth();
  const { 
    canViewReports, 
    canConfigureReports, 
    isDirector, 
    userRole, 
    loading: roleLoading 
  } = useRolePermissions();
  const customPermissions = useCustomPermissions();
  const { toast } = useToast();

  // Determinar a unidade do coordenador
  const coordinatorUnit = userRole === 'coordinator_madre' ? 'madre' : 
                         userRole === 'coordinator_floresta' ? 'floresta' :
                         userRole === 'coordinator_atendimento_floresta' ? 'atendimento_floresta' : null;

  // Debug: Log user info
  useEffect(() => {
    console.log('Reports Debug:', {
      user: user?.id,
      userRole,
      canViewReports: canViewReports(),
      isDirector: isDirector(),
      roleLoading
    });
  }, [user, userRole, roleLoading]);

  useEffect(() => {
    if (roleLoading || customPermissions.loading) return;

    const canAccessReports = userRole === 'director' || 
                            userRole === 'coordinator_madre' || 
                            userRole === 'coordinator_floresta' ||
                            userRole === 'coordinator_atendimento_floresta' ||
                            customPermissions.hasPermission('view_reports');
    
    if (!canAccessReports) {
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Acesso Restrito",
        description: "Você não tem permissão para acessar os relatórios."
      });
      return;
    }

    if (coordinatorUnit && selectedUnit === 'all') {
      setSelectedUnit(coordinatorUnit);
    }

    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadEmployees(),
          loadClients(),
          loadAttendanceReports(),
          loadEmployeeReports()
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedEmployee, selectedClient, selectedUnit, dateFrom, dateTo, selectedMonth, sessionType, roleLoading, userRole, customPermissions.loading]);

  const loadClients = async () => {
    try {
      let query = supabase
        .from('clients')
        .select('id, name, unit')
        .eq('is_active', true);

      // Aplicar filtro de unidade baseado no role
      if (coordinatorUnit) {
        // Coordenadores veem apenas sua unidade
        query = query.eq('unit', coordinatorUnit);
      } else if (selectedUnit !== 'all') {
        // Diretores podem filtrar por unidade escolhida
        query = query.eq('unit', selectedUnit);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      setClients([]);
    }
  };

  const loadAttendanceReports = async () => {
    try {
      let query = supabase
        .from('attendance_reports')
        .select(`
          *,
          clients!attendance_reports_client_id_fkey(name, unit)
        `)
        .order('start_time', { ascending: false });

      if (selectedEmployee !== 'all') {
        query = query.eq('employee_id', selectedEmployee);
      }
      
      if (selectedClient !== 'all') {
        query = query.eq('client_id', selectedClient);
      }
      
      if (dateFrom) {
        query = query.gte('start_time', dateFrom);
      }
      
      if (dateTo) {
        query = query.lte('start_time', dateTo + 'T23:59:59');
      }
      
      if (selectedMonth && !dateFrom && !dateTo) {
        const monthStart = startOfMonth(parseISO(selectedMonth + '-01'));
        const monthEnd = endOfMonth(parseISO(selectedMonth + '-01'));
        query = query.gte('start_time', format(monthStart, 'yyyy-MM-dd'))
                    .lte('start_time', format(monthEnd, 'yyyy-MM-dd') + 'T23:59:59');
      }
      
      if (sessionType !== 'all') {
        query = query.eq('attendance_type', sessionType);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      
      let filteredData = data || [];
      if (coordinatorUnit) {
        filteredData = filteredData.filter(report => 
          report.clients?.unit === coordinatorUnit
        );
      } else if (selectedUnit !== 'all') {
        filteredData = filteredData.filter(report => 
          report.clients?.unit === selectedUnit
        );
      }
      
      // Buscar todos os profiles de uma vez
      const employeeIds = [...new Set(filteredData.map(r => r.employee_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', employeeIds);
      
      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p.name]) || []);
      
      const reportsWithNames = filteredData.map(report => ({
        ...report,
        profiles: { name: profilesMap.get(report.employee_id) || report.professional_name || 'Nome não encontrado' },
        clients: { name: report.patient_name || report.clients?.name }
      }));
      
      setAttendanceReports(reportsWithNames);
    } catch (error) {
      console.error('Error loading attendance reports:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os relatórios de atendimento."
      });
      setAttendanceReports([]);
    }
  };

  const loadEmployees = async () => {
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .not('employee_role', 'is', null)
        .order('name');

      // Filtrar por unidade se selecionado
      if (selectedUnit !== 'all') {
        query = query.eq('unit', selectedUnit);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployees([]);
    }
  };

  const loadEmployeeReports = async () => {
    try {
      let query = supabase
        .from('employee_reports')
        .select(`
          *,
          clients!employee_reports_client_id_fkey(name, unit)
        `)
        .order('session_date', { ascending: false })
        .limit(50);

      if (selectedEmployee !== 'all') {
        query = query.eq('employee_id', selectedEmployee);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      let filteredData = data || [];
      if (coordinatorUnit) {
        filteredData = filteredData.filter(report => 
          report.clients?.unit === coordinatorUnit
        );
      } else if (selectedUnit !== 'all') {
        filteredData = filteredData.filter(report => 
          report.clients?.unit === selectedUnit
        );
      }
      
      // Buscar todos os profiles de uma vez
      const employeeIds = [...new Set(filteredData.map(r => r.employee_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', employeeIds);
      
      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p.name]) || []);
      
      const reportsWithNames = filteredData.map(report => ({
        ...report,
        profiles: { name: profilesMap.get(report.employee_id) || 'Nome não encontrado' }
      }));
      
      setEmployeeReports(reportsWithNames);
    } catch (error) {
      console.error('Error loading employee reports:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os relatórios."
      });
      setEmployeeReports([]);
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Data', 'Funcionário', 'Cliente', 'Tipo', 'Duração', 'Qualidade', 'Objetivos', 'Materiais', 'Valor'].join(','),
      ...attendanceReports.map(report => [
        format(new Date(report.start_time), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        report.profiles?.name || '',
        report.clients?.name || '',
        report.attendance_type || '',
        report.session_duration ? `${report.session_duration} min` : '',
        report.quality_rating || '',
        report.techniques_used || '',
        Array.isArray(report.materials_used) ? 
          report.materials_used.map((m: any) => `${m.name} (${m.quantity})`).join('; ') : '',
        report.amount_charged ? `R$ ${report.amount_charged.toFixed(2)}` : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_atendimentos_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;
    const lineHeight = 6;
    const sectionSpacing = 10;

    const addNewPage = () => {
      doc.addPage();
      yPos = margin;
      addFooter();
    };

    const checkPageBreak = (requiredSpace: number) => {
      if (yPos + requiredSpace > pageHeight - 25) {
        addNewPage();
      }
    };

    const addFooter = () => {
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Página ${i} de ${totalPages} - Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
    };

    const wrapText = (text: string, maxWidth: number): string[] => {
      if (!text) return [];
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      words.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = doc.getTextWidth(testLine);
        if (testWidth > maxWidth) {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });
      if (currentLine) lines.push(currentLine);
      return lines;
    };

    // Título do Relatório
    doc.setFontSize(18);
    doc.setTextColor(33, 33, 33);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Atendimentos', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Informações do Filtro
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);

    const filterInfo: string[] = [];
    if (selectedEmployee !== 'all') {
      filterInfo.push(`Funcionário: ${employees.find(e => e.user_id === selectedEmployee)?.name || '-'}`);
    }
    if (selectedClient !== 'all') {
      filterInfo.push(`Paciente: ${clients.find(c => c.id === selectedClient)?.name || '-'}`);
    }
    if (selectedUnit !== 'all') {
      const unitName = selectedUnit === 'madre' ? 'MADRE' : 
                       selectedUnit === 'floresta' ? 'Floresta' : 
                       selectedUnit === 'atendimento_floresta' ? 'Atendimento Floresta' : selectedUnit;
      filterInfo.push(`Unidade: ${unitName}`);
    }
    if (sessionType !== 'all') {
      filterInfo.push(`Tipo: ${sessionType}`);
    }
    if (dateFrom) {
      filterInfo.push(`De: ${format(new Date(dateFrom), 'dd/MM/yyyy')}`);
    }
    if (dateTo) {
      filterInfo.push(`Até: ${format(new Date(dateTo), 'dd/MM/yyyy')}`);
    }
    if (!dateFrom && !dateTo && selectedMonth) {
      filterInfo.push(`Mês: ${format(parseISO(selectedMonth + '-01'), 'MMMM/yyyy', { locale: ptBR })}`);
    }

    if (filterInfo.length > 0) {
      doc.text(`Filtros: ${filterInfo.join(' | ')}`, margin, yPos);
      yPos += lineHeight;
    }

    doc.text(`Total de atendimentos: ${attendanceReports.length}`, margin, yPos);
    yPos += lineHeight;
    doc.text(`Receita total: R$ ${getTotalRevenue().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin, yPos);
    yPos += sectionSpacing;

    // Linha separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += sectionSpacing;

    // Iterar sobre cada atendimento
    attendanceReports.forEach((report, index) => {
      checkPageBreak(80);

      // Cabeçalho do atendimento
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPos - 2, pageWidth - margin * 2, 8, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(33, 33, 33);
      doc.text(
        `${index + 1}. ${report.clients?.name || report.patient_name || 'Paciente N/A'} - ${format(new Date(report.start_time), 'dd/MM/yyyy', { locale: ptBR })}`,
        margin + 2,
        yPos + 3
      );
      yPos += 10;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(66, 66, 66);

      // Informações básicas
      const basicInfo = [
        `Funcionário: ${report.profiles?.name || report.professional_name || 'N/A'}`,
        `Horário: ${format(new Date(report.start_time), 'HH:mm')} - ${format(new Date(report.end_time), 'HH:mm')}`,
        `Duração: ${report.session_duration ? `${report.session_duration} min` : 'N/A'}`,
        `Tipo: ${report.attendance_type || 'N/A'}`,
        `Status: ${report.validation_status === 'validated' ? 'Validado' : report.validation_status === 'pending_validation' ? 'Pendente' : report.validation_status || 'N/A'}`,
      ];

      basicInfo.forEach(info => {
        doc.text(info, margin, yPos);
        yPos += lineHeight - 1;
      });

      yPos += 2;

      // Técnicas/Objetivos
      if (report.techniques_used) {
        checkPageBreak(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Técnicas/Objetivos:', margin, yPos);
        yPos += lineHeight - 1;
        doc.setFont('helvetica', 'normal');
        const lines = wrapText(report.techniques_used, pageWidth - margin * 2);
        lines.forEach(line => {
          checkPageBreak(lineHeight);
          doc.text(line, margin, yPos);
          yPos += lineHeight - 1;
        });
        yPos += 2;
      }

      // Resposta do Paciente
      if (report.patient_response) {
        checkPageBreak(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Resposta do Paciente:', margin, yPos);
        yPos += lineHeight - 1;
        doc.setFont('helvetica', 'normal');
        const lines = wrapText(report.patient_response, pageWidth - margin * 2);
        lines.forEach(line => {
          checkPageBreak(lineHeight);
          doc.text(line, margin, yPos);
          yPos += lineHeight - 1;
        });
        yPos += 2;
      }

      // Notas da Sessão
      if (report.session_notes) {
        checkPageBreak(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Notas da Sessão:', margin, yPos);
        yPos += lineHeight - 1;
        doc.setFont('helvetica', 'normal');
        const lines = wrapText(report.session_notes, pageWidth - margin * 2);
        lines.forEach(line => {
          checkPageBreak(lineHeight);
          doc.text(line, margin, yPos);
          yPos += lineHeight - 1;
        });
        yPos += 2;
      }

      // Plano próxima sessão
      if (report.next_session_plan) {
        checkPageBreak(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Plano Próxima Sessão:', margin, yPos);
        yPos += lineHeight - 1;
        doc.setFont('helvetica', 'normal');
        const lines = wrapText(report.next_session_plan, pageWidth - margin * 2);
        lines.forEach(line => {
          checkPageBreak(lineHeight);
          doc.text(line, margin, yPos);
          yPos += lineHeight - 1;
        });
        yPos += 2;
      }

      // Observações
      if (report.observations) {
        checkPageBreak(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Observações:', margin, yPos);
        yPos += lineHeight - 1;
        doc.setFont('helvetica', 'normal');
        const lines = wrapText(report.observations, pageWidth - margin * 2);
        lines.forEach(line => {
          checkPageBreak(lineHeight);
          doc.text(line, margin, yPos);
          yPos += lineHeight - 1;
        });
        yPos += 2;
      }

      // Materiais utilizados
      if (Array.isArray(report.materials_used) && report.materials_used.length > 0) {
        checkPageBreak(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Materiais Utilizados:', margin, yPos);
        yPos += lineHeight - 1;
        doc.setFont('helvetica', 'normal');
        report.materials_used.forEach((material: any) => {
          checkPageBreak(lineHeight);
          const materialText = `• ${material.name} - Qtd: ${material.quantity}${material.total_cost ? ` - R$ ${material.total_cost.toFixed(2)}` : ''}`;
          doc.text(materialText, margin + 2, yPos);
          yPos += lineHeight - 1;
        });
        yPos += 2;
      }

      // Valores Financeiros
      checkPageBreak(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 128, 0);
      doc.text(
        `Valor Total: R$ ${(report.amount_charged || 0).toFixed(2)} | Profissional: R$ ${(report.professional_amount || 0).toFixed(2)} | Instituição: R$ ${(report.institution_amount || 0).toFixed(2)}`,
        margin,
        yPos
      );
      yPos += lineHeight;

      // Validação
      if (report.validated_by_name || report.completed_by_name) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        const validationText = [];
        if (report.completed_by_name) validationText.push(`Completado por: ${report.completed_by_name}`);
        if (report.validated_by_name) validationText.push(`Validado por: ${report.validated_by_name}`);
        doc.text(validationText.join(' | '), margin, yPos);
        yPos += lineHeight;
      }

      // Linha separadora entre atendimentos
      doc.setTextColor(66, 66, 66);
      yPos += 3;
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += sectionSpacing;
    });

    // Adicionar rodapé em todas as páginas
    addFooter();

    // Salvar o PDF
    const fileName = `relatorio_atendimentos_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`;
    doc.save(fileName);

    toast({
      title: "PDF Exportado",
      description: `Relatório salvo como ${fileName}`,
    });
  };

  const clearFilters = () => {
    setSelectedEmployee('all');
    setSelectedClient('all');
    setSelectedUnit('all');
    setDateFrom('');
    setDateTo('');
    setSelectedMonth(format(new Date(), 'yyyy-MM'));
    setSessionType('all');
  };

  const getTotalSessions = () => attendanceReports.length;
  const getTotalRevenue = () => attendanceReports.reduce((sum, report) => sum + (report.amount_charged || 0), 0);
  const getAverageDuration = () => {
    const durationsWithValues = attendanceReports.filter(r => r.session_duration && r.session_duration > 0);
    if (durationsWithValues.length === 0) return 0;
    return durationsWithValues.reduce((sum, r) => sum + (r.session_duration || 0), 0) / durationsWithValues.length;
  };
  const getUniqueClients = () => new Set(attendanceReports.map(r => r.client_id)).size;

  const getAverageRating = (reports: EmployeeReport[], field: string) => {
    const ratingsWithValues = reports.filter(r => r[field] && r[field] > 0);
    if (ratingsWithValues.length === 0) return 0;
    return ratingsWithValues.reduce((sum, r) => sum + (r[field] || 0), 0) / ratingsWithValues.length;
  };

  const renderStars = (rating?: number) => {
    if (!rating) return <span className="text-muted-foreground">-</span>;
    
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading || roleLoading) {
    return <div className="p-6">Carregando relatórios...</div>;
  }

  // Verificar se tem permissão para acessar
  const canAccessReports = userRole === 'director' || 
                          userRole === 'coordinator_madre' || 
                          userRole === 'coordinator_floresta';
  
  if (!canAccessReports) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Acesso restrito a coordenadores e diretores</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-2 sm:px-0">
      {/* Cabeçalho Moderno */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-fade-in">
        <div className="relative">
          <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 via-indigo-600 to-indigo-700 rounded-full" />
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
            Relatórios de Atendimento
          </h1>
          <p className="text-muted-foreground mt-2">
            Analise dados, exporte relatórios e acompanhe indicadores
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {isDirector() && (
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteFinancialDialogOpen(true)}
              className="text-destructive hover:text-destructive flex-1 sm:flex-none text-sm"
            >
              <Trash2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Excluir Registros</span>
            </Button>
          )}
          {canConfigureReports?.() && (
            <Button variant="outline" onClick={clearFilters} className="flex-1 sm:flex-none text-sm">
              <Filter className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Limpar</span>
            </Button>
          )}
          <Button onClick={exportToCSV} disabled={attendanceReports.length === 0} variant="outline" className="flex-1 sm:flex-none text-sm">
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
          <Button onClick={exportToPDF} disabled={attendanceReports.length === 0} className="flex-1 sm:flex-none text-sm">
            <FileDown className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-indigo-500/10 via-card to-indigo-500/5">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessões</CardTitle>
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <FileText className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
              {getTotalSessions()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Atendimentos</p>
          </CardContent>
        </Card>
        
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-green-500/10 via-card to-green-500/5">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita</CardTitle>
            <div className="p-2 bg-green-500/20 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
              R$ {getTotalRevenue().toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total arrecadado</p>
          </CardContent>
        </Card>
        
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-purple-500/10 via-card to-purple-500/5">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duração Média</CardTitle>
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Clock className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
              {Math.round(getAverageDuration())} min
            </div>
            <p className="text-xs text-muted-foreground mt-1">Por sessão</p>
          </CardContent>
        </Card>
        
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-blue-500/10 via-card to-blue-500/5">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pacientes</CardTitle>
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
              {getUniqueClients()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Atendidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Aviso sobre geração automática de relatórios */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-indigo-500/10 via-card to-blue-500/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <BarChart3 className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">
              <strong>Novo!</strong> Os relatórios são gerados automaticamente quando você completa um atendimento.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filtros Avançados */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-indigo-500/5">
        <CardHeader className="p-4 sm:p-6 border-b border-indigo-500/10">
          <CardTitle className="flex items-center gap-3 text-base sm:text-lg">
            <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 rounded-lg">
              <Search className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
            </div>
            <span className="bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent font-bold">
              Filtros de Pesquisa
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="space-y-4 sm:space-y-6">
            {/* Primeira linha: Funcionário, Paciente, Unidade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Funcionário</Label>
                <Combobox
                  options={[
                    { value: "all", label: "Todos os funcionários" },
                    ...employees.map(employee => ({
                      value: employee.user_id,
                      label: employee.name
                    }))
                  ]}
                  value={selectedEmployee}
                  onValueChange={setSelectedEmployee}
                  placeholder="Buscar funcionário..."
                  searchPlaceholder="Digite o nome do funcionário..."
                  emptyMessage="Nenhum funcionário encontrado."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Paciente</Label>
                <Combobox
                  options={[
                    { value: "all", label: "Todos os pacientes" },
                    ...clients.map(client => ({
                      value: client.id,
                      label: client.name
                    }))
                  ]}
                  value={selectedClient}
                  onValueChange={setSelectedClient}
                  placeholder="Buscar paciente..."
                  searchPlaceholder="Digite o nome do paciente..."
                  emptyMessage="Nenhum paciente encontrado."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Unidade</Label>
                <Select 
                  value={selectedUnit} 
                  onValueChange={setSelectedUnit}
                  disabled={!!coordinatorUnit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    {!coordinatorUnit && <SelectItem value="all">Todas as unidades</SelectItem>}
                    <SelectItem value="madre">MADRE (Clínica Social)</SelectItem>
                    <SelectItem value="floresta">Floresta (Neuroavaliação)</SelectItem>
                    <SelectItem value="atendimento_floresta">Atendimento Floresta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Segunda linha: Tipo de Atendimento e Período */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tipo de Atendimento</Label>
                <Select value={sessionType} onValueChange={setSessionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="Consulta">Consulta</SelectItem>
                    <SelectItem value="Terapia">Terapia</SelectItem>
                    <SelectItem value="Avaliação">Avaliação</SelectItem>
                    <SelectItem value="Fonoaudiologia">Fonoaudiologia</SelectItem>
                    <SelectItem value="Psicologia">Psicologia</SelectItem>
                    <SelectItem value="Musicoterapia">Musicoterapia</SelectItem>
                    <SelectItem value="Fisioterapia">Fisioterapia</SelectItem>
                    <SelectItem value="Nutrição">Nutrição</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Mês</Label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Data Inicial</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Data Final</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* Resumo dos filtros */}
          {(selectedEmployee !== 'all' || selectedClient !== 'all' || selectedUnit !== 'all' || dateFrom || dateTo || sessionType !== 'all') && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">Filtros aplicados:</p>
              <div className="flex flex-wrap gap-2">
                {selectedEmployee !== 'all' && (
                  <Badge variant="outline">
                    Funcionário: {employees.find(e => e.user_id === selectedEmployee)?.name}
                  </Badge>
                )}
                {selectedClient !== 'all' && (
                  <Badge variant="outline">
                    Paciente: {clients.find(c => c.id === selectedClient)?.name}
                  </Badge>
                )}
                {selectedUnit !== 'all' && (
                  <Badge variant="outline">
                    Unidade: {selectedUnit === 'madre' ? 'MADRE' : 
                             selectedUnit === 'floresta' ? 'Floresta' :
                             selectedUnit === 'atendimento_floresta' ? 'Atendimento Floresta' :
                             selectedUnit}
                  </Badge>
                )}
                {sessionType !== 'all' && (
                  <Badge variant="outline">Tipo: {sessionType}</Badge>
                )}
                {dateFrom && (
                  <Badge variant="outline">De: {format(new Date(dateFrom), 'dd/MM/yyyy')}</Badge>
                )}
                {dateTo && (
                  <Badge variant="outline">Até: {format(new Date(dateTo), 'dd/MM/yyyy')}</Badge>
                )}
                <Badge variant="secondary">{attendanceReports.length} atendimentos</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dashboard de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Atendimentos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalSessions()}</div>
            <p className="text-xs text-muted-foreground">
              Atendimentos {dateFrom || dateTo ? 'no período' : 'registrados'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Únicos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getUniqueClients()}</div>
            <p className="text-xs text-muted-foreground">Clientes atendidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duração Média</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(getAverageDuration())} min
            </div>
            <p className="text-xs text-muted-foreground">Por atendimento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {getTotalRevenue().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {dateFrom || dateTo ? 'No período' : 'Total registrado'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="attendance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="attendance">Relatórios de Atendimento</TabsTrigger>
          <TabsTrigger value="sessions">Sessões Detalhadas</TabsTrigger>
          <TabsTrigger value="performance">Desempenho</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Relatórios Completos de Atendimento</CardTitle>
              <p className="text-sm text-muted-foreground">
                Visão completa dos atendimentos realizados com todas as informações registradas
              </p>
            </CardHeader>
            <CardContent>
              {attendanceReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum atendimento encontrado com os filtros aplicados.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Técnicas/Objetivos</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceReports.map((report) => (
                      <TableRow key={report.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">
                              {format(new Date(report.start_time), 'dd/MM/yyyy', { locale: ptBR })}
                            </div>
                            <div className="text-muted-foreground">
                              {format(new Date(report.start_time), 'HH:mm', { locale: ptBR })} - {' '}
                              {format(new Date(report.end_time), 'HH:mm', { locale: ptBR })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => setSelectedEmployee(report.employee_id)}
                            className="font-medium text-primary hover:underline text-left"
                          >
                            {report.profiles?.name || 'N/A'}
                          </button>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => setSelectedClient(report.client_id)}
                            className="font-medium text-primary hover:underline text-left"
                          >
                            {report.clients?.name || 'N/A'}
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{report.attendance_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {report.session_duration ? `${report.session_duration} min` : '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate" title={report.techniques_used || ''}>
                            {report.techniques_used || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-green-600">
                            {report.amount_charged ? `R$ ${report.amount_charged.toFixed(2)}` : '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedReport(report);
                              setIsDetailDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver Tudo
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Sessões Detalhadas</CardTitle>
              <p className="text-sm text-muted-foreground">
                Informações detalhadas das sessões incluindo avaliações e métricas de qualidade
              </p>
            </CardHeader>
            <CardContent>
              {employeeReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma sessão detalhada encontrada com os filtros aplicados.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Esforço</TableHead>
                      <TableHead>Qualidade</TableHead>
                      <TableHead>Cooperação</TableHead>
                      <TableHead>Objetivos</TableHead>
                      <TableHead>Materiais</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          {format(new Date(report.session_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => setSelectedEmployee(report.employee_id)}
                            className="font-medium text-primary hover:underline text-left"
                          >
                            {report.profiles?.name || 'N/A'}
                          </button>
                        </TableCell>
                        <TableCell>
                          {report.clients?.name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{report.session_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {report.session_duration ? `${report.session_duration} min` : '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {renderStars(report.effort_rating)}
                            {report.effort_rating && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({report.effort_rating})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {renderStars(report.quality_rating)}
                            {report.quality_rating && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({report.quality_rating})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {renderStars(report.patient_cooperation)}
                            {report.patient_cooperation && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({report.patient_cooperation})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {renderStars(report.goal_achievement)}
                            {report.goal_achievement && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({report.goal_achievement})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold">
                            {report.materials_cost && report.materials_cost > 0 
                              ? `R$ ${report.materials_cost.toFixed(2)}` 
                              : '-'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Avaliações por Critério</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Esforço</span>
                  <div className="flex items-center gap-2">
                    {renderStars(getAverageRating(employeeReports, 'effort_rating'))}
                    <span className="text-sm text-muted-foreground">
                      ({getAverageRating(employeeReports, 'effort_rating').toFixed(1)})
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Qualidade</span>
                  <div className="flex items-center gap-2">
                    {renderStars(getAverageRating(employeeReports, 'quality_rating'))}
                    <span className="text-sm text-muted-foreground">
                      ({getAverageRating(employeeReports, 'quality_rating').toFixed(1)})
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Cooperação do Paciente</span>
                  <div className="flex items-center gap-2">
                    {renderStars(getAverageRating(employeeReports, 'patient_cooperation'))}
                    <span className="text-sm text-muted-foreground">
                      ({getAverageRating(employeeReports, 'patient_cooperation').toFixed(1)})
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Alcance de Objetivos</span>
                  <div className="flex items-center gap-2">
                    {renderStars(getAverageRating(employeeReports, 'goal_achievement'))}
                    <span className="text-sm text-muted-foreground">
                      ({getAverageRating(employeeReports, 'goal_achievement').toFixed(1)})
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estatísticas Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total de Clientes Atendidos</span>
                  <span className="font-semibold">
                    {new Set(employeeReports.map(r => r.client_id)).size}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Sessões este Mês</span>
                  <span className="font-semibold">
                    {employeeReports.filter(r => 
                      new Date(r.session_date).getMonth() === new Date().getMonth()
                    ).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tempo Total de Atendimento</span>
                  <span className="font-semibold">
                    {Math.round(
                      employeeReports.reduce((sum, r) => sum + (r.session_duration || 0), 0) / 60
                    )} horas
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="materials">
          <Card>
            <CardHeader>
              <CardTitle>Uso de Materiais por Sessão</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo de Sessão</TableHead>
                    <TableHead>Custo de Materiais</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeReports
                    .filter(report => report.materials_cost && report.materials_cost > 0)
                    .map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          {format(new Date(report.session_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>{report.profiles?.name}</TableCell>
                        <TableCell>{report.clients?.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{report.session_type}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          R$ {report.materials_cost.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate" title={report.professional_notes || ''}>
                            {report.professional_notes || '-'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Analytics Avançados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <Label>Funcionário</Label>
                    <Combobox
                      options={[
                        { value: "all", label: "Todos os funcionários" },
                        ...employees.map(employee => ({
                          value: employee.user_id,
                          label: employee.name
                        }))
                      ]}
                      value={selectedEmployee}
                      onValueChange={setSelectedEmployee}
                      placeholder="Buscar funcionário..."
                      searchPlaceholder="Digite o nome do funcionário..."
                      emptyMessage="Nenhum funcionário encontrado."
                    />
                  </div>

                  <div>
                    <Label>Paciente</Label>
                    <Combobox
                      options={[
                        { value: "all", label: "Todos os pacientes" },
                        ...clients.map(client => ({
                          value: client.id,
                          label: client.name
                        }))
                      ]}
                      value={selectedClient}
                      onValueChange={setSelectedClient}
                      placeholder="Buscar paciente..."
                      searchPlaceholder="Digite o nome do paciente..."
                      emptyMessage="Nenhum paciente encontrado."
                    />
                  </div>

                  <div>
                    <Label>Período</Label>
                    <Input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Taxa de Conclusão</p>
                          <p className="text-2xl font-bold text-green-600">
                            {attendanceReports.length > 0 
                              ? Math.round((attendanceReports.filter(r => r.validation_status === 'validated').length / attendanceReports.length) * 100)
                              : 0}%
                          </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Receita Total</p>
                          <p className="text-2xl font-bold text-blue-600">
                            R$ {getTotalRevenue().toFixed(2)}
                          </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Pacientes Únicos</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {getUniqueClients()}
                          </p>
                        </div>
                        <Users className="h-8 w-8 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Tempo Médio</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {Math.round(getAverageDuration())} min
                          </p>
                        </div>
                        <Clock className="h-8 w-8 text-orange-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Relatório Detalhado do Funcionário */}
                {selectedEmployee !== 'all' && (
                  <div className="grid gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          Relatório Detalhado - {employees.find(e => e.user_id === selectedEmployee)?.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                          <Card>
                            <CardContent className="p-4">
                              <div className="text-center">
                                <p className="text-sm text-muted-foreground">Total de Atendimentos</p>
                                <p className="text-3xl font-bold text-blue-600">
                                  {attendanceReports.length}
                                </p>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent className="p-4">
                              <div className="text-center">
                                <p className="text-sm text-muted-foreground">Horas Trabalhadas</p>
                                <p className="text-3xl font-bold text-green-600">
                                  {Math.round(attendanceReports.reduce((sum, r) => sum + (r.session_duration || 0), 0) / 60)}h
                                </p>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent className="p-4">
                              <div className="text-center">
                                <p className="text-sm text-muted-foreground">Receita Gerada</p>
                                <p className="text-3xl font-bold text-green-600">
                                  R$ {getTotalRevenue().toFixed(2)}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Tabela de Atendimentos */}
                        <div className="border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Paciente</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Duração</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {attendanceReports.map((report) => (
                                <TableRow key={report.id}>
                                  <TableCell>
                                    {format(new Date(report.start_time), 'dd/MM/yyyy', { locale: ptBR })}
                                  </TableCell>
                                  <TableCell>{report.patient_name || report.clients?.name}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{report.attendance_type}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    {report.session_duration ? `${report.session_duration} min` : '-'}
                                  </TableCell>
                                  <TableCell>
                                    {report.amount_charged ? `R$ ${report.amount_charged.toFixed(2)}` : '-'}
                                  </TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant={
                                        report.validation_status === 'validated' ? 'default' :
                                        report.validation_status === 'rejected' ? 'destructive' :
                                        'secondary'
                                      }
                                    >
                                      {report.validation_status === 'validated' ? 'Validado' :
                                       report.validation_status === 'rejected' ? 'Rejeitado' :
                                       'Pendente'}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {attendanceReports.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Nenhum atendimento encontrado para os filtros selecionados</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Análise de Performance */}
                    {employeeReports.filter(r => r.employee_id === selectedEmployee).length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Análise de Performance</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <h4 className="font-semibold">Avaliações Médias</h4>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span>Qualidade</span>
                                  <div className="flex items-center gap-2">
                                    {renderStars(getAverageRating(employeeReports.filter(r => r.employee_id === selectedEmployee), 'quality_rating'))}
                                    <span className="text-sm text-muted-foreground">
                                      ({getAverageRating(employeeReports.filter(r => r.employee_id === selectedEmployee), 'quality_rating').toFixed(1)})
                                    </span>
                                  </div>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span>Esforço</span>
                                  <div className="flex items-center gap-2">
                                    {renderStars(getAverageRating(employeeReports.filter(r => r.employee_id === selectedEmployee), 'effort_rating'))}
                                    <span className="text-sm text-muted-foreground">
                                      ({getAverageRating(employeeReports.filter(r => r.employee_id === selectedEmployee), 'effort_rating').toFixed(1)})
                                    </span>
                                  </div>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span>Cooperação do Paciente</span>
                                  <div className="flex items-center gap-2">
                                    {renderStars(getAverageRating(employeeReports.filter(r => r.employee_id === selectedEmployee), 'patient_cooperation'))}
                                    <span className="text-sm text-muted-foreground">
                                      ({getAverageRating(employeeReports.filter(r => r.employee_id === selectedEmployee), 'patient_cooperation').toFixed(1)})
                                    </span>
                                  </div>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span>Alcance de Objetivos</span>
                                  <div className="flex items-center gap-2">
                                    {renderStars(getAverageRating(employeeReports.filter(r => r.employee_id === selectedEmployee), 'goal_achievement'))}
                                    <span className="text-sm text-muted-foreground">
                                      ({getAverageRating(employeeReports.filter(r => r.employee_id === selectedEmployee), 'goal_achievement').toFixed(1)})
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <h4 className="font-semibold">Estatísticas do Período</h4>
                              <div className="space-y-3">
                                <div className="flex justify-between">
                                  <span>Pacientes Atendidos</span>
                                  <span className="font-semibold">
                                    {new Set(attendanceReports.map(r => r.client_id)).size}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Tempo Total</span>
                                  <span className="font-semibold">
                                    {Math.round(attendanceReports.reduce((sum, r) => sum + (r.session_duration || 0), 0) / 60)} horas
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Custo de Materiais</span>
                                  <span className="font-semibold">
                                    R$ {employeeReports
                                      .filter(r => r.employee_id === selectedEmployee)
                                      .reduce((sum, r) => sum + (r.materials_cost || 0), 0)
                                      .toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Sessões Validadas</span>
                                  <span className="font-semibold">
                                    {attendanceReports.filter(r => r.validation_status === 'validated').length}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Visão Geral quando nenhum funcionário específico está selecionado */}
                {selectedEmployee === 'all' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Resumo Geral dos Funcionários</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Funcionário</TableHead>
                            <TableHead>Atendimentos</TableHead>
                            <TableHead>Pacientes</TableHead>
                            <TableHead>Horas</TableHead>
                            <TableHead>Receita</TableHead>
                            <TableHead>Qualidade Média</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {employees.map((employee) => {
                            const employeeAttendances = attendanceReports.filter(r => r.employee_id === employee.user_id);
                            const employeeEmployeeReports = employeeReports.filter(r => r.employee_id === employee.user_id);
                            const totalHours = Math.round(employeeAttendances.reduce((sum, r) => sum + (r.session_duration || 0), 0) / 60);
                            const totalRevenue = employeeAttendances.reduce((sum, r) => sum + (r.amount_charged || 0), 0);
                            const uniquePatients = new Set(employeeAttendances.map(r => r.client_id)).size;
                            const avgQuality = getAverageRating(employeeEmployeeReports, 'quality_rating');

                            return (
                              <TableRow key={employee.user_id}>
                                <TableCell className="font-medium">{employee.name}</TableCell>
                                <TableCell>{employeeAttendances.length}</TableCell>
                                <TableCell>{uniquePatients}</TableCell>
                                <TableCell>{totalHours}h</TableCell>
                                <TableCell>R$ {totalRevenue.toFixed(2)}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {renderStars(avgQuality)}
                                    <span className="text-sm text-muted-foreground">
                                      ({avgQuality.toFixed(1)})
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <DeleteFinancialRecordsDialog 
        open={isDeleteFinancialDialogOpen}
        onClose={() => setIsDeleteFinancialDialogOpen(false)}
      />

      {/* Dialog de Detalhes do Atendimento */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalhes Completos do Atendimento
            </DialogTitle>
          </DialogHeader>
          
          {selectedReport && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6">
                {/* Informações Básicas */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Data/Hora</Label>
                    <p className="font-medium">
                      {format(new Date(selectedReport.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      {' - '}
                      {format(new Date(selectedReport.end_time), 'HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Duração</Label>
                    <p className="font-medium">
                      {selectedReport.session_duration ? `${selectedReport.session_duration} minutos` : 'Não informada'}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Funcionário e Paciente */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Funcionário</Label>
                    <button
                      onClick={() => {
                        setSelectedEmployee(selectedReport.employee_id);
                        setIsDetailDialogOpen(false);
                      }}
                      className="font-medium text-primary hover:underline text-left block"
                    >
                      {selectedReport.profiles?.name || selectedReport.professional_name || 'N/A'}
                    </button>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Paciente</Label>
                    <button
                      onClick={() => {
                        setSelectedClient(selectedReport.client_id);
                        setIsDetailDialogOpen(false);
                      }}
                      className="font-medium text-primary hover:underline text-left block"
                    >
                      {selectedReport.clients?.name || selectedReport.patient_name || 'N/A'}
                    </button>
                  </div>
                </div>

                <Separator />

                {/* Tipo e Status */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Tipo de Atendimento</Label>
                    <Badge variant="outline">{selectedReport.attendance_type}</Badge>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Badge variant={selectedReport.validation_status === 'validated' ? 'default' : 'secondary'}>
                      {selectedReport.validation_status === 'validated' ? 'Validado' : 
                       selectedReport.validation_status === 'pending_validation' ? 'Pendente' : 
                       selectedReport.validation_status || 'N/A'}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Valor Cobrado</Label>
                    <p className="font-semibold text-green-600">
                      {selectedReport.amount_charged ? `R$ ${selectedReport.amount_charged.toFixed(2)}` : 'Não informado'}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Técnicas/Objetivos */}
                {selectedReport.techniques_used && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Técnicas/Objetivos Utilizados</Label>
                    <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                      {selectedReport.techniques_used}
                    </p>
                  </div>
                )}

                {/* Resposta do Paciente */}
                {selectedReport.patient_response && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Resposta do Paciente</Label>
                    <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                      {selectedReport.patient_response}
                    </p>
                  </div>
                )}

                {/* Notas da Sessão */}
                {selectedReport.session_notes && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Notas da Sessão</Label>
                    <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                      {selectedReport.session_notes}
                    </p>
                  </div>
                )}

                {/* Plano para Próxima Sessão */}
                {selectedReport.next_session_plan && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Plano para Próxima Sessão</Label>
                    <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                      {selectedReport.next_session_plan}
                    </p>
                  </div>
                )}

                {/* Observações */}
                {selectedReport.observations && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Observações</Label>
                    <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                      {selectedReport.observations}
                    </p>
                  </div>
                )}

                <Separator />

                {/* Materiais Utilizados */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Materiais Utilizados</Label>
                  {Array.isArray(selectedReport.materials_used) && selectedReport.materials_used.length > 0 ? (
                    <div className="bg-muted p-3 rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Material</TableHead>
                            <TableHead>Quantidade</TableHead>
                            <TableHead>Custo Unit.</TableHead>
                            <TableHead>Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedReport.materials_used.map((material: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell>{material.name}</TableCell>
                              <TableCell>{material.quantity}</TableCell>
                              <TableCell>
                                {material.unit_cost ? `R$ ${material.unit_cost.toFixed(2)}` : '-'}
                              </TableCell>
                              <TableCell>
                                {material.total_cost ? `R$ ${material.total_cost.toFixed(2)}` : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum material utilizado</p>
                  )}
                </div>

                <Separator />

                {/* Valores Financeiros */}
                <div className="grid grid-cols-3 gap-4 bg-muted/50 p-4 rounded-md">
                  <div className="space-y-1 text-center">
                    <Label className="text-xs text-muted-foreground">Valor Total</Label>
                    <p className="font-bold text-lg text-green-600">
                      R$ {(selectedReport.amount_charged || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-1 text-center">
                    <Label className="text-xs text-muted-foreground">Profissional</Label>
                    <p className="font-semibold">
                      R$ {(selectedReport.professional_amount || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-1 text-center">
                    <Label className="text-xs text-muted-foreground">Instituição</Label>
                    <p className="font-semibold">
                      R$ {(selectedReport.institution_amount || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Informações de Validação */}
                {(selectedReport.validated_by_name || selectedReport.completed_by_name) && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedReport.completed_by_name && (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Completado por</Label>
                          <p>{selectedReport.completed_by_name}</p>
                        </div>
                      )}
                      {selectedReport.validated_by_name && (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Validado por</Label>
                          <p>{selectedReport.validated_by_name}</p>
                          {selectedReport.validated_at && (
                            <p className="text-xs text-muted-foreground">
                              em {format(new Date(selectedReport.validated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Motivo de Rejeição (se houver) */}
                {selectedReport.rejection_reason && (
                  <div className="space-y-2 bg-destructive/10 p-3 rounded-md">
                    <Label className="text-xs text-destructive">Motivo da Rejeição</Label>
                    <p className="text-sm">{selectedReport.rejection_reason}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}