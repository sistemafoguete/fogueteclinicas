import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { FileText, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import logoImage from '@/assets/fundacao-logo-report.png';

interface Client {
  id: string;
  name: string;
  cpf?: string;
  birth_date?: string;
  email?: string;
  phone?: string;
  responsible_name?: string;
  responsible_phone?: string;
  unit?: string;
  address?: string;
  diagnosis?: string;
  neuropsych_complaint?: string;
  is_active: boolean;
  created_at: string;
}

interface AttendanceReport {
  id: string;
  start_time: string;
  end_time: string;
  professional_name: string;
  attendance_type: string;
  session_notes?: string;
  techniques_used?: string;
  patient_response?: string;
  amount_charged?: number;
  session_duration?: number;
  validated_at?: string;
  validated_by_name?: string;
}

interface MultiPatientReportGeneratorProps {
  clients: Client[];
  isOpen: boolean;
  onClose: () => void;
}

export function MultiPatientReportGenerator({ clients, isOpen, onClose }: MultiPatientReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPatient, setCurrentPatient] = useState('');
  const { toast } = useToast();

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return '-';
    const birth = new Date(birthDate);
    const today = new Date();
    const age = Math.floor((today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    return `${age} anos`;
  };

  const getUnitLabel = (unit?: string) => {
    switch (unit) {
      case 'madre': return 'MADRE (Clínica Social)';
      case 'floresta': return 'Floresta (Neuroavaliação)';
      case 'atendimento_floresta': return 'Atendimento Floresta';
      default: return unit || 'N/A';
    }
  };

  const getAttendanceTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'consultation': 'Consulta',
      'therapy': 'Terapia',
      'evaluation': 'Avaliação',
      'follow_up': 'Retorno',
      'anamnesis': 'Anamnese',
      'neuroassessment': 'Neuroavaliação',
    };
    return types[type] || type;
  };

  const fetchAttendanceReports = async (clientId: string): Promise<AttendanceReport[]> => {
    const { data, error } = await supabase
      .from('attendance_reports')
      .select('*')
      .eq('client_id', clientId)
      .eq('validation_status', 'validated')
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching attendance reports:', error);
      return [];
    }

    return data || [];
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    setProgress(0);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;

      // Para cada paciente, gerar páginas
      for (let i = 0; i < clients.length; i++) {
        const client = clients[i];
        setCurrentPatient(client.name);
        setProgress(((i + 0.5) / clients.length) * 100);

        // Buscar atendimentos validados do paciente
        const attendanceReports = await fetchAttendanceReports(client.id);

        if (i > 0) {
          pdf.addPage();
        }

        let yPos = margin;

        // Header com logo
        try {
          const img = new Image();
          img.src = logoImage;
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
          pdf.addImage(img, 'PNG', pageWidth / 2 - 25, yPos, 50, 20);
          yPos += 25;
        } catch {
          yPos += 10;
        }

        // Título
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(33, 37, 41);
        pdf.text('RELATÓRIO DO PACIENTE', pageWidth / 2, yPos, { align: 'center' });
        yPos += 8;

        // Subtítulo
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(108, 117, 125);
        pdf.text(`Paciente ${i + 1} de ${clients.length} - Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 12;

        // Linha separadora
        pdf.setDrawColor(200, 200, 200);
        pdf.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;

        // Dados Pessoais
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(33, 37, 41);
        pdf.text('DADOS PESSOAIS', margin, yPos);
        yPos += 8;

        // Tabela de dados pessoais
        autoTable(pdf, {
          startY: yPos,
          head: [],
          body: [
            ['Nome Completo', client.name],
            ['CPF', client.cpf || 'Não informado'],
            ['Data de Nascimento', client.birth_date ? `${formatDate(client.birth_date)} (${calculateAge(client.birth_date)})` : 'Não informado'],
            ['Telefone', client.phone || 'Não informado'],
            ['Email', client.email || 'Não informado'],
            ['Unidade', getUnitLabel(client.unit)],
            ['Endereço', client.address || 'Não informado'],
            ['Status', client.is_active ? 'Ativo' : 'Inativo'],
          ],
          theme: 'striped',
          styles: { fontSize: 9, cellPadding: 3 },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 50 },
            1: { cellWidth: 'auto' },
          },
          margin: { left: margin, right: margin },
        });

        yPos = (pdf as any).lastAutoTable.finalY + 10;

        // Responsável (se houver)
        if (client.responsible_name || client.responsible_phone) {
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text('RESPONSÁVEL', margin, yPos);
          yPos += 8;

          autoTable(pdf, {
            startY: yPos,
            head: [],
            body: [
              ['Nome do Responsável', client.responsible_name || 'Não informado'],
              ['Telefone do Responsável', client.responsible_phone || 'Não informado'],
            ],
            theme: 'striped',
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
              0: { fontStyle: 'bold', cellWidth: 50 },
              1: { cellWidth: 'auto' },
            },
            margin: { left: margin, right: margin },
          });

          yPos = (pdf as any).lastAutoTable.finalY + 10;
        }

        // Informações Clínicas
        if (client.diagnosis || client.neuropsych_complaint) {
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text('INFORMAÇÕES CLÍNICAS', margin, yPos);
          yPos += 8;

          const clinicalData: string[][] = [];
          if (client.diagnosis) {
            clinicalData.push(['Diagnóstico', client.diagnosis]);
          }
          if (client.neuropsych_complaint) {
            clinicalData.push(['Queixa Neuropsicológica', client.neuropsych_complaint]);
          }

          if (clinicalData.length > 0) {
            autoTable(pdf, {
              startY: yPos,
              head: [],
              body: clinicalData,
              theme: 'striped',
              styles: { fontSize: 9, cellPadding: 3 },
              columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 50 },
                1: { cellWidth: 'auto' },
              },
              margin: { left: margin, right: margin },
            });

            yPos = (pdf as any).lastAutoTable.finalY + 10;
          }
        }

        // Histórico de Atendimentos Validados
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(33, 37, 41);
        
        // Verificar se precisa de nova página
        if (yPos > pageHeight - 60) {
          pdf.addPage();
          yPos = margin;
        }
        
        pdf.text(`HISTÓRICO DE ATENDIMENTOS (${attendanceReports.length} validados)`, margin, yPos);
        yPos += 8;

        if (attendanceReports.length === 0) {
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'italic');
          pdf.setTextColor(108, 117, 125);
          pdf.text('Nenhum atendimento validado encontrado.', margin, yPos);
          yPos += 10;
        } else {
          // Tabela resumo de atendimentos
          const attendanceTableData = attendanceReports.map((att) => [
            formatDateTime(att.start_time),
            att.professional_name,
            getAttendanceTypeLabel(att.attendance_type),
            att.session_duration ? `${att.session_duration} min` : '-',
            att.amount_charged ? `R$ ${att.amount_charged.toFixed(2)}` : '-',
          ]);

          autoTable(pdf, {
            startY: yPos,
            head: [['Data/Hora', 'Profissional', 'Tipo', 'Duração', 'Valor']],
            body: attendanceTableData,
            theme: 'striped',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
            columnStyles: {
              0: { cellWidth: 35 },
              1: { cellWidth: 45 },
              2: { cellWidth: 30 },
              3: { cellWidth: 20 },
              4: { cellWidth: 25 },
            },
            margin: { left: margin, right: margin },
            didDrawPage: () => {
              // Rodapé em cada página
              pdf.setFontSize(8);
              pdf.setTextColor(150, 150, 150);
              pdf.text(
                `Fundação Dom Bosco - Relatório Confidencial`,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
              );
            },
          });

          yPos = (pdf as any).lastAutoTable.finalY + 10;

          // Detalhes de cada atendimento
          for (let j = 0; j < attendanceReports.length; j++) {
            const att = attendanceReports[j];
            
            // Verificar se precisa de nova página
            if (yPos > pageHeight - 80) {
              pdf.addPage();
              yPos = margin;
            }

            // Cabeçalho do atendimento
            pdf.setFillColor(240, 240, 240);
            pdf.rect(margin, yPos - 4, pageWidth - margin * 2, 8, 'F');
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(33, 37, 41);
            pdf.text(`Atendimento ${j + 1}: ${formatDateTime(att.start_time)} - ${att.professional_name}`, margin + 2, yPos);
            yPos += 10;

            // Detalhes do atendimento
            const detailsData: string[][] = [];
            
            if (att.techniques_used) {
              detailsData.push(['Técnicas Utilizadas', att.techniques_used]);
            }
            if (att.patient_response) {
              detailsData.push(['Resposta do Paciente', att.patient_response]);
            }
            if (att.session_notes) {
              detailsData.push(['Observações da Sessão', att.session_notes]);
            }
            if (att.validated_by_name) {
              detailsData.push(['Validado por', `${att.validated_by_name} em ${formatDateTime(att.validated_at)}`]);
            }

            if (detailsData.length > 0) {
              autoTable(pdf, {
                startY: yPos,
                head: [],
                body: detailsData,
                theme: 'plain',
                styles: { fontSize: 8, cellPadding: 2 },
                columnStyles: {
                  0: { fontStyle: 'bold', cellWidth: 40, textColor: [100, 100, 100] },
                  1: { cellWidth: 'auto' },
                },
                margin: { left: margin, right: margin },
              });

              yPos = (pdf as any).lastAutoTable.finalY + 8;
            } else {
              yPos += 4;
            }
          }
        }

        setProgress(((i + 1) / clients.length) * 100);

        // Rodapé da página principal do paciente
        const currentPage = pdf.getNumberOfPages();
        pdf.setPage(currentPage);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Fundação Dom Bosco - Relatório Confidencial - Paciente ${i + 1}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      // Salvar PDF
      const fileName = clients.length === 1 
        ? `Relatorio_${clients[0].name.replace(/\s+/g, '_')}.pdf`
        : `Relatorio_${clients.length}_Pacientes_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
      
      pdf.save(fileName);

      toast({
        title: "Relatório gerado com sucesso!",
        description: `PDF com ${clients.length} paciente(s) e histórico de atendimentos foi baixado.`,
      });

      onClose();
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro ao gerar relatório",
        description: "Houve um problema ao gerar o PDF. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setProgress(0);
      setCurrentPatient('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gerar Relatório em PDF
          </DialogTitle>
          <DialogDescription>
            {clients.length} paciente(s) selecionado(s) - Inclui histórico de atendimentos validados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lista de pacientes selecionados */}
          <div className="max-h-60 overflow-y-auto border rounded-lg p-3 space-y-2">
            {clients.map((client, index) => (
              <div key={client.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="w-6 h-6 rounded-full flex items-center justify-center text-xs">
                    {index + 1}
                  </Badge>
                  <span className="font-medium text-sm">{client.name}</span>
                </div>
                <Badge variant={client.unit === 'madre' ? 'default' : 'secondary'} className="text-xs">
                  {client.unit === 'madre' ? 'MADRE' : 
                   client.unit === 'floresta' ? 'Floresta' : 
                   client.unit === 'atendimento_floresta' ? 'Atend.' : 'N/A'}
                </Badge>
              </div>
            ))}
          </div>

          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Gerando relatório...</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              {currentPatient && (
                <p className="text-xs text-muted-foreground">Processando: {currentPatient}</p>
              )}
            </div>
          )}

          <Separator />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isGenerating}>
              Cancelar
            </Button>
            <Button onClick={generatePDF} disabled={isGenerating} className="gap-2">
              <Download className="h-4 w-4" />
              {isGenerating ? 'Gerando...' : `Gerar PDF (${clients.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
