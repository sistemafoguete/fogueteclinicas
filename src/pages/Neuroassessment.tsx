import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Brain, FileDown, FileSpreadsheet, Calendar, Filter, Users, Clock, UserCheck, UserX, Pencil } from 'lucide-react';
import { format, differenceInYears, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MaterialUsed {
  stock_item_id: string;
  name: string;
  quantity: number;
  unit: string;
}

interface NeuroClient {
  id: string;
  name: string;
  birth_date: string | null;
  gender: string | null;
  neuro_test_start_date: string | null;
  neuro_report_deadline: string | null;
  neuro_report_file_path: string | null;
  neuro_diagnosis_suggestion: string | null;
  neuro_diagnosis_by: string | null;
  neuro_tests_applied: string[] | null;
  neuro_socioeconomic: string | null;
  neuro_final_diagnosis: string | null;
  neuro_completed_date: string | null;
  neuro_patient_code: string | null;
  neuro_relevant_history: string | null;
  neuro_diagnostic_agreement: string | null;
  neuro_divergence_type: string | null;
  neuro_observations: string | null;
  unit: string | null;
  total_hours?: number;
  materials_used?: string[];
}

const COLORS = ['#3b82f6', '#ec4899', '#8b5cf6', '#6b7280'];
const STATUS_COLORS = ['#22c55e', '#f59e0b'];

export default function Neuroassessment() {
  const [clients, setClients] = useState<NeuroClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportStatus, setReportStatus] = useState<string>('all');
  const [editingClient, setEditingClient] = useState<NeuroClient | null>(null);
  const [editForm, setEditForm] = useState({
    neuro_patient_code: '',
    gender: '',
    neuro_test_start_date: '',
    neuro_report_deadline: '',
    neuro_diagnosis_suggestion: '',
    neuro_diagnosis_by: '',
    neuro_relevant_history: '',
    neuro_report_delivered: false,
    neuro_tests_applied: '',
    neuro_socioeconomic: '',
    neuro_final_diagnosis: '',
    neuro_completed_date: '',
    neuro_diagnostic_agreement: '',
    neuro_divergence_type: '',
    neuro_observations: ''
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const openEditDialog = (client: NeuroClient) => {
    setEditingClient(client);
    setEditForm({
      neuro_patient_code: client.neuro_patient_code || '',
      gender: client.gender || '',
      neuro_test_start_date: client.neuro_test_start_date || '',
      neuro_report_deadline: client.neuro_report_deadline || '',
      neuro_diagnosis_suggestion: client.neuro_diagnosis_suggestion || '',
      neuro_diagnosis_by: client.neuro_diagnosis_by || '',
      neuro_relevant_history: client.neuro_relevant_history || '',
      neuro_report_delivered: !!client.neuro_report_file_path,
      neuro_tests_applied: Array.isArray(client.neuro_tests_applied) ? client.neuro_tests_applied.join(', ') : '',
      neuro_socioeconomic: client.neuro_socioeconomic || '',
      neuro_final_diagnosis: client.neuro_final_diagnosis || '',
      neuro_completed_date: client.neuro_completed_date || '',
      neuro_diagnostic_agreement: client.neuro_diagnostic_agreement || '',
      neuro_divergence_type: client.neuro_divergence_type || '',
      neuro_observations: client.neuro_observations || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingClient) return;
    
    setSaving(true);
    try {
      const testsArray = editForm.neuro_tests_applied
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const { error } = await supabase
        .from('clients')
        .update({
          neuro_patient_code: editForm.neuro_patient_code || null,
          gender: editForm.gender || null,
          neuro_test_start_date: editForm.neuro_test_start_date || null,
          neuro_report_deadline: editForm.neuro_report_deadline || null,
          neuro_diagnosis_suggestion: editForm.neuro_diagnosis_suggestion || null,
          neuro_diagnosis_by: editForm.neuro_diagnosis_by || null,
          neuro_relevant_history: editForm.neuro_relevant_history || null,
          neuro_report_file_path: editForm.neuro_report_delivered ? 'delivered' : null,
          neuro_tests_applied: testsArray.length > 0 ? testsArray : null,
          neuro_socioeconomic: editForm.neuro_socioeconomic || null,
          neuro_final_diagnosis: editForm.neuro_final_diagnosis || null,
          neuro_completed_date: editForm.neuro_completed_date || null,
          neuro_diagnostic_agreement: editForm.neuro_diagnostic_agreement || null,
          neuro_divergence_type: editForm.neuro_divergence_type || null,
          neuro_observations: editForm.neuro_observations || null
        })
        .eq('id', editingClient.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Dados de neuroavaliação atualizados!",
      });

      setEditingClient(null);
      loadNeuroClients();
    } catch (error) {
      console.error('Error updating client:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar os dados.",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadNeuroClients();
  }, [startDate, endDate, reportStatus]);

  const loadNeuroClients = async () => {
    setLoading(true);
    try {
      // Busca todos os pacientes da unidade Floresta (Neuroavaliação), inclusive inativos
      let query = supabase
        .from('clients')
        .select('*')
        .eq('unit', 'floresta');

      if (startDate) {
        query = query.gte('neuro_test_start_date', startDate);
      }
      if (endDate) {
        query = query.lte('neuro_test_start_date', endDate);
      }

      if (reportStatus === 'pending') {
        query = query.is('neuro_report_file_path', null);
      } else if (reportStatus === 'delivered') {
        query = query.not('neuro_report_file_path', 'is', null);
      }

      const { data: clientsData, error } = await query.order('name');

      if (error) throw error;

      const clientsWithHours = await Promise.all(
        (clientsData || []).map(async (client, index) => {
          const { data: attendances } = await supabase
            .from('attendance_reports')
            .select('session_duration, materials_used')
            .eq('client_id', client.id)
            .eq('status', 'completed');

          const totalMinutes = attendances?.reduce((sum, att) => sum + (att.session_duration || 0), 0) || 0;
          const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

          // Extrair materiais únicos usados nos atendimentos
          const materialsMap = new Map<string, string>();
          attendances?.forEach(att => {
            if (att.materials_used && Array.isArray(att.materials_used)) {
              (att.materials_used as unknown as MaterialUsed[]).forEach(material => {
                if (material.name && !materialsMap.has(material.name)) {
                  materialsMap.set(material.name, material.name);
                }
              });
            }
          });
          const uniqueMaterials = Array.from(materialsMap.values());

          // Gerar código se não existir
          const patientCode = (client as any).neuro_patient_code || `PC${String(index + 1).padStart(2, '0')}`;

          return {
            ...client,
            neuro_tests_applied: client.neuro_tests_applied as string[] | null,
            neuro_diagnosis_by: (client as any).neuro_diagnosis_by || null,
            neuro_final_diagnosis: (client as any).neuro_final_diagnosis || null,
            neuro_completed_date: (client as any).neuro_completed_date || null,
            neuro_patient_code: patientCode,
            neuro_relevant_history: (client as any).neuro_relevant_history || null,
            neuro_diagnostic_agreement: (client as any).neuro_diagnostic_agreement || null,
            neuro_divergence_type: (client as any).neuro_divergence_type || null,
            neuro_observations: (client as any).neuro_observations || null,
            total_hours: totalHours,
            materials_used: uniqueMaterials
          };
        })
      );

      setClients(clientsWithHours);
    } catch (error) {
      console.error('Error loading neuro clients:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os dados de neuroavaliação.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Estatísticas calculadas
  const stats = {
    total: clients.length,
    pending: clients.filter(c => !c.neuro_report_file_path).length,
    delivered: clients.filter(c => c.neuro_report_file_path).length,
    totalHours: clients.reduce((sum, c) => sum + (c.total_hours || 0), 0),
    male: clients.filter(c => c.gender === 'masculino').length,
    female: clients.filter(c => c.gender === 'feminino').length,
    other: clients.filter(c => c.gender === 'outro' || c.gender === 'nao-informar' || !c.gender).length
  };

  // Dados para gráficos
  const genderData = [
    { name: 'Masculino', value: stats.male, color: '#3b82f6' },
    { name: 'Feminino', value: stats.female, color: '#ec4899' },
    { name: 'Outro/N.I.', value: stats.other, color: '#6b7280' }
  ].filter(d => d.value > 0);

  const statusData = [
    { name: 'Entregues', value: stats.delivered, color: '#22c55e' },
    { name: 'Pendentes', value: stats.pending, color: '#f59e0b' }
  ].filter(d => d.value > 0);

  // Dados socioeconômicos
  const socioData = ['A', 'B', 'C', 'D', 'E'].map(level => ({
    name: `Classe ${level}`,
    value: clients.filter(c => c.neuro_socioeconomic === level).length
  })).filter(d => d.value > 0);

  // Suspeitas de diagnóstico mais comuns
  const diagnosisCount: Record<string, number> = {};
  clients.forEach(c => {
    if (c.neuro_diagnosis_suggestion) {
      const diag = c.neuro_diagnosis_suggestion.trim();
      diagnosisCount[diag] = (diagnosisCount[diag] || 0) + 1;
    }
  });
  const diagnosisData = Object.entries(diagnosisCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const calculateAge = (birthDate: string | null): number | null => {
    if (!birthDate) return null;
    try {
      return differenceInYears(new Date(), parseISO(birthDate));
    } catch {
      return null;
    }
  };

  const formatAge = (birthDate: string | null): string => {
    const age = calculateAge(birthDate);
    return age !== null ? `${age} anos` : '-';
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const getGenderLabel = (gender: string | null): string => {
    const labels: Record<string, string> = {
      'masculino': 'M',
      'feminino': 'F',
      'outro': 'O',
      'nao-informar': '-'
    };
    return gender ? labels[gender] || '-' : '-';
  };

  const getGenderFull = (gender: string | null): string => {
    const labels: Record<string, string> = {
      'masculino': 'Masculino',
      'feminino': 'Feminino',
      'outro': 'Outro',
      'nao-informar': 'Não informado'
    };
    return gender ? labels[gender] || '-' : '-';
  };

  const getReportStatus = (filePath: string | null): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    return filePath 
      ? { label: 'Entregue', variant: 'default' }
      : { label: 'Pendente', variant: 'secondary' };
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a3');
    
    doc.setFontSize(18);
    doc.setTextColor(0, 102, 153);
    doc.text('FUNDAÇÃO DOM BOSCO', 210, 15, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Relatório de Neuroavaliação', 210, 23, { align: 'center' });
    
    let filterText = 'Período: ';
    if (startDate && endDate) {
      filterText += `${formatDate(startDate)} a ${formatDate(endDate)}`;
    } else if (startDate) {
      filterText += `A partir de ${formatDate(startDate)}`;
    } else if (endDate) {
      filterText += `Até ${formatDate(endDate)}`;
    } else {
      filterText += 'Todos';
    }
    
    if (reportStatus !== 'all') {
      filterText += ` | Status: ${reportStatus === 'pending' ? 'Pendente' : 'Entregue'}`;
    }
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(filterText, 210, 30, { align: 'center' });

    // Resumo estatístico
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    const summaryText = `Total: ${stats.total} | Masculino: ${stats.male} | Feminino: ${stats.female} | Pendentes: ${stats.pending} | Entregues: ${stats.delivered} | Horas: ${stats.totalHours.toFixed(1)}h`;
    doc.text(summaryText, 210, 36, { align: 'center' });

    const tableData = clients.map(client => [
      client.neuro_patient_code || '-',
      client.name,
      formatDate(client.birth_date),
      calculateAge(client.birth_date) !== null ? `${calculateAge(client.birth_date)}` : '-',
      getGenderLabel(client.gender),
      client.neuro_diagnosis_by || '-',
      client.neuro_diagnosis_suggestion || '-',
      client.neuro_relevant_history?.substring(0, 30) || '-',
      formatDate(client.neuro_test_start_date),
      formatDate(client.neuro_report_deadline),
      formatDate(client.neuro_completed_date),
      client.materials_used?.join(', ')?.substring(0, 30) || '-',
      client.total_hours ? `${client.total_hours}h` : '-',
      getReportStatus(client.neuro_report_file_path).label,
      client.neuro_final_diagnosis?.substring(0, 25) || '-',
      client.neuro_diagnostic_agreement || '-',
      client.neuro_divergence_type?.substring(0, 15) || '-',
      client.neuro_socioeconomic || '-',
      client.neuro_observations?.substring(0, 20) || '-'
    ]);

    autoTable(doc, {
      startY: 42,
      head: [['Cód.', 'Nome', 'Nasc.', 'Idade', 'Sexo', 'Encam.', 'Suspeita', 'Histórico', 'Início', 'Prev.', 'Final.', 'Materiais', 'Horas', 'Status', 'Resultado', 'Concord.', 'Diverg.', 'Socio.', 'Obs.']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [0, 102, 153],
        textColor: 255,
        fontSize: 6,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 5
      },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 30 },
        2: { cellWidth: 18 },
        3: { cellWidth: 10 },
        4: { cellWidth: 10 },
        5: { cellWidth: 20 },
        6: { cellWidth: 22 },
        7: { cellWidth: 25 },
        8: { cellWidth: 18 },
        9: { cellWidth: 18 },
        10: { cellWidth: 18 },
        11: { cellWidth: 28 },
        12: { cellWidth: 12 },
        13: { cellWidth: 15 },
        14: { cellWidth: 22 },
        15: { cellWidth: 15 },
        16: { cellWidth: 18 },
        17: { cellWidth: 12 },
        18: { cellWidth: 18 }
      },
      margin: { left: 10, right: 10 }
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Total de Pacientes: ${clients.length}`, 14, doc.internal.pageSize.height - 10);
      doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
      doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 210, doc.internal.pageSize.height - 10, { align: 'center' });
    }

    doc.save(`relatorio-neuroavaliacao-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    
    toast({
      title: "PDF Exportado",
      description: "Relatório de neuroavaliação exportado com sucesso!",
    });
  };

  const exportToExcel = () => {
    const excelData = clients.map(client => ({
      'Código': client.neuro_patient_code || '-',
      'Nome': client.name,
      'Data de Nascimento': formatDate(client.birth_date),
      'Idade': calculateAge(client.birth_date) !== null ? calculateAge(client.birth_date) : '-',
      'Sexo': getGenderFull(client.gender),
      'Encaminhado por': client.neuro_diagnosis_by || '-',
      'Suspeita de Diagnóstico': client.neuro_diagnosis_suggestion || '-',
      'Histórico Relevante': client.neuro_relevant_history || '-',
      'Início dos Testes': formatDate(client.neuro_test_start_date),
      'Previsão de Laudo': formatDate(client.neuro_report_deadline),
      'Data de Finalização': formatDate(client.neuro_completed_date),
      'Materiais/Testes Utilizados': client.materials_used && client.materials_used.length > 0 ? client.materials_used.join(', ') : '-',
      'Horas Totais': client.total_hours || 0,
      'Status do Laudo': getReportStatus(client.neuro_report_file_path).label,
      'Resultado do Laudo': client.neuro_final_diagnosis || '-',
      'Concordância Diagnóstica': client.neuro_diagnostic_agreement || '-',
      'Tipo de Divergência': client.neuro_divergence_type || '-',
      'Condição Socioeconômica': client.neuro_socioeconomic || '-',
      'Observações': client.neuro_observations || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Neuroavaliação');
    
    ws['!cols'] = [
      { wch: 10 }, { wch: 35 }, { wch: 15 }, { wch: 8 }, { wch: 12 },
      { wch: 25 }, { wch: 25 }, { wch: 35 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 30 },
      { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 30 }
    ];

    XLSX.writeFile(wb, `relatorio-neuroavaliacao-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    
    toast({
      title: "Excel Exportado",
      description: "Relatório de neuroavaliação exportado com sucesso!",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Brain className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Neuroavaliação</h1>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToPDF} disabled={clients.length === 0}>
            <FileDown className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
          <Button variant="outline" onClick={exportToExcel} disabled={clients.length === 0}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startDate">Data Início</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Data Fim</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="reportStatus">Status do Laudo</Label>
              <Select value={reportStatus} onValueChange={setReportStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md z-50">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="delivered">Entregue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setReportStatus('all');
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas Principais */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileDown className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Entregues</p>
                <p className="text-2xl font-bold">{stats.delivered}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Horas</p>
                <p className="text-2xl font-bold">{stats.totalHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-sky-500/10 to-sky-600/5 border-sky-200 dark:border-sky-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-sky-500" />
              <div>
                <p className="text-sm text-muted-foreground">Masculino</p>
                <p className="text-2xl font-bold">{stats.male}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border-pink-200 dark:border-pink-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserX className="h-8 w-8 text-pink-500" />
              <div>
                <p className="text-sm text-muted-foreground">Feminino</p>
                <p className="text-2xl font-bold">{stats.female}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      {clients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Gráfico de Sexo */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Distribuição por Sexo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico de Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Status dos Laudos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico Socioeconômico */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Nível Socioeconômico</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={socioData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={60} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico de Diagnósticos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Suspeitas de Diagnóstico</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={diagnosisData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela de Pacientes */}
      <Card>
        <CardHeader>
          <CardTitle>Relatório de Neuroavaliação</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : clients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum paciente encontrado com os filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Código</TableHead>
                    <TableHead className="whitespace-nowrap">Nome</TableHead>
                    <TableHead className="whitespace-nowrap">Nascimento</TableHead>
                    <TableHead className="whitespace-nowrap">Idade</TableHead>
                    <TableHead className="whitespace-nowrap">Sexo</TableHead>
                    <TableHead className="whitespace-nowrap">Encaminhado por</TableHead>
                    <TableHead className="whitespace-nowrap">Suspeita de Diagnóstico</TableHead>
                    <TableHead className="whitespace-nowrap">Histórico Relevante</TableHead>
                    <TableHead className="whitespace-nowrap">Início Testes</TableHead>
                    <TableHead className="whitespace-nowrap">Previsão Laudo</TableHead>
                    <TableHead className="whitespace-nowrap">Data Finalização</TableHead>
                    <TableHead className="whitespace-nowrap">Materiais/Testes</TableHead>
                    <TableHead className="whitespace-nowrap">Horas Totais</TableHead>
                    <TableHead className="whitespace-nowrap">Status Laudo</TableHead>
                    <TableHead className="whitespace-nowrap">Resultado do Laudo</TableHead>
                    <TableHead className="whitespace-nowrap">Concordância Diagnóstica</TableHead>
                    <TableHead className="whitespace-nowrap">Tipo de Divergência</TableHead>
                    <TableHead className="whitespace-nowrap">Socioeconômico</TableHead>
                    <TableHead className="whitespace-nowrap">Observações</TableHead>
                    <TableHead className="w-[60px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => {
                    const status = getReportStatus(client.neuro_report_file_path);
                    return (
                      <TableRow key={client.id}>
                        <TableCell className="font-mono text-xs">{client.neuro_patient_code || '-'}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap">{client.name}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(client.birth_date)}</TableCell>
                        <TableCell>{formatAge(client.birth_date)}</TableCell>
                        <TableCell>{getGenderFull(client.gender)}</TableCell>
                        <TableCell className="text-muted-foreground">{client.neuro_diagnosis_by || '-'}</TableCell>
                        <TableCell>{client.neuro_diagnosis_suggestion || '-'}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={client.neuro_relevant_history || ''}>
                          {client.neuro_relevant_history || '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(client.neuro_test_start_date)}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(client.neuro_report_deadline)}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(client.neuro_completed_date)}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={client.materials_used?.join(', ') || ''}>
                          {client.materials_used && client.materials_used.length > 0
                            ? client.materials_used.join(', ')
                            : '-'}
                        </TableCell>
                        <TableCell>{client.total_hours ? `${client.total_hours}h` : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate" title={client.neuro_final_diagnosis || ''}>
                          {client.neuro_final_diagnosis || '-'}
                        </TableCell>
                        <TableCell>{client.neuro_diagnostic_agreement || '-'}</TableCell>
                        <TableCell className="max-w-[120px] truncate" title={client.neuro_divergence_type || ''}>
                          {client.neuro_divergence_type || '-'}
                        </TableCell>
                        <TableCell>{client.neuro_socioeconomic || '-'}</TableCell>
                        <TableCell className="max-w-[120px] truncate" title={client.neuro_observations || ''}>
                          {client.neuro_observations || '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(client)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={!!editingClient} onOpenChange={(open) => !open && setEditingClient(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Editar Neuroavaliação - {editingClient?.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-code">Código do Paciente</Label>
                  <Input
                    id="edit-code"
                    value={editForm.neuro_patient_code}
                    onChange={(e) => setEditForm({ ...editForm, neuro_patient_code: e.target.value })}
                    placeholder="PC01, PC02..."
                  />
                </div>
                <div>
                  <Label htmlFor="edit-gender">Sexo</Label>
                  <Select
                    value={editForm.gender}
                    onValueChange={(value) => setEditForm({ ...editForm, gender: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-md z-50">
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                      <SelectItem value="nao-informar">Não informar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-diagnosis-by">Encaminhado por</Label>
                <Input
                  id="edit-diagnosis-by"
                  value={editForm.neuro_diagnosis_by}
                  onChange={(e) => setEditForm({ ...editForm, neuro_diagnosis_by: e.target.value })}
                  placeholder="Nome do médico/profissional"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-diagnosis">Suspeita de Diagnóstico</Label>
                <Input
                  id="edit-diagnosis"
                  value={editForm.neuro_diagnosis_suggestion}
                  onChange={(e) => setEditForm({ ...editForm, neuro_diagnosis_suggestion: e.target.value })}
                  placeholder="Ex: TDAH, TEA, Dislexia..."
                />
              </div>
              
              <div>
                <Label htmlFor="edit-history">Histórico Relevante</Label>
                <Textarea
                  id="edit-history"
                  value={editForm.neuro_relevant_history}
                  onChange={(e) => setEditForm({ ...editForm, neuro_relevant_history: e.target.value })}
                  placeholder="Histórico médico, escolar, familiar relevante..."
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-start-date">Início dos Testes</Label>
                  <Input
                    id="edit-start-date"
                    type="date"
                    value={editForm.neuro_test_start_date}
                    onChange={(e) => setEditForm({ ...editForm, neuro_test_start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-deadline">Previsão de Laudo</Label>
                  <Input
                    id="edit-deadline"
                    type="date"
                    value={editForm.neuro_report_deadline}
                    onChange={(e) => setEditForm({ ...editForm, neuro_report_deadline: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-completed-date">Data de Finalização</Label>
                  <Input
                    id="edit-completed-date"
                    type="date"
                    value={editForm.neuro_completed_date}
                    onChange={(e) => setEditForm({ ...editForm, neuro_completed_date: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-tests">Materiais/Testes Utilizados (separados por vírgula)</Label>
                <Textarea
                  id="edit-tests"
                  value={editForm.neuro_tests_applied}
                  onChange={(e) => setEditForm({ ...editForm, neuro_tests_applied: e.target.value })}
                  placeholder="WISC-IV, Bender, HTP..."
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-status">Status do Laudo</Label>
                  <Select
                    value={editForm.neuro_report_delivered ? 'delivered' : 'pending'}
                    onValueChange={(value) => setEditForm({ ...editForm, neuro_report_delivered: value === 'delivered' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-md z-50">
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="delivered">Entregue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-socio">Condição Socioeconômica</Label>
                  <Select
                    value={editForm.neuro_socioeconomic}
                    onValueChange={(value) => setEditForm({ ...editForm, neuro_socioeconomic: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-md z-50">
                      <SelectItem value="A">Classe A</SelectItem>
                      <SelectItem value="B">Classe B</SelectItem>
                      <SelectItem value="C">Classe C</SelectItem>
                      <SelectItem value="D">Classe D</SelectItem>
                      <SelectItem value="E">Classe E</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-final-diagnosis">Resultado do Laudo</Label>
                <Textarea
                  id="edit-final-diagnosis"
                  value={editForm.neuro_final_diagnosis}
                  onChange={(e) => setEditForm({ ...editForm, neuro_final_diagnosis: e.target.value })}
                  placeholder="Diagnóstico final após avaliação..."
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-agreement">Concordância Diagnóstica</Label>
                  <Select
                    value={editForm.neuro_diagnostic_agreement}
                    onValueChange={(value) => setEditForm({ ...editForm, neuro_diagnostic_agreement: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-md z-50">
                      <SelectItem value="Sim">Sim</SelectItem>
                      <SelectItem value="Parcial">Parcial</SelectItem>
                      <SelectItem value="Não">Não</SelectItem>
                      <SelectItem value="N/A">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-divergence">Tipo de Divergência</Label>
                  <Input
                    id="edit-divergence"
                    value={editForm.neuro_divergence_type}
                    onChange={(e) => setEditForm({ ...editForm, neuro_divergence_type: e.target.value })}
                    placeholder="Descreva a divergência se houver..."
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-observations">Observações</Label>
                <Textarea
                  id="edit-observations"
                  value={editForm.neuro_observations}
                  onChange={(e) => setEditForm({ ...editForm, neuro_observations: e.target.value })}
                  placeholder="Observações adicionais..."
                  rows={3}
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingClient(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
