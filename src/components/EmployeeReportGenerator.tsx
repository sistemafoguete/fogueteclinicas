import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ROLE_LABELS } from '@/hooks/useRolePermissions';
import { useToast } from '@/hooks/use-toast';

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
}

interface TimesheetEntry {
  id: string;
  date: string;
  clock_in: string;
  clock_out: string;
  total_hours: number;
  status: string;
}

interface Props {
  employee: EmployeeData;
  attendances: AttendanceReport[];
  timesheet: TimesheetEntry[];
}

export function EmployeeReportGenerator({ employee, attendances, timesheet }: Props) {
  const { toast } = useToast();

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

  const generatePDF = async () => {
    try {
      toast({
        title: "Gerando relatório...",
        description: "Por favor, aguarde."
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let currentY = margin;

      // Função auxiliar para adicionar nova página
      const addNewPage = () => {
        pdf.addPage();
        currentY = margin;
      };

      // Função auxiliar para verificar espaço
      const checkSpace = (needed: number) => {
        if (currentY + needed > pageHeight - margin) {
          addNewPage();
          return true;
        }
        return false;
      };

      // Cabeçalho
      pdf.setFillColor(30, 58, 138); // primary color
      pdf.rect(0, 0, pageWidth, 40, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RELATÓRIO DO FUNCIONÁRIO', pageWidth / 2, 20, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Gerado em: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, 30, { align: 'center' });

      currentY = 50;

      // Dados Pessoais
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DADOS PESSOAIS', margin, currentY);
      currentY += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const personalData = [
        ['Nome:', employee.name],
        ['Email:', employee.email || 'N/A'],
        ['Telefone:', employee.phone || 'N/A'],
        ['CPF:', employee.document_cpf || 'N/A'],
        ['Cargo:', ROLE_LABELS[employee.employee_role as keyof typeof ROLE_LABELS]],
        ['Departamento:', employee.department || 'N/A'],
        ['Data de Contratação:', employee.hire_date ? format(new Date(employee.hire_date), 'dd/MM/yyyy') : 'N/A'],
        ['Status:', employee.is_active ? 'Ativo' : 'Inativo']
      ];

      personalData.forEach(([label, value]) => {
        checkSpace(7);
        pdf.setFont('helvetica', 'bold');
        pdf.text(label, margin, currentY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(value, margin + 50, currentY);
        currentY += 7;
      });

      currentY += 5;

      // Estatísticas
      checkSpace(40);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ESTATÍSTICAS', margin, currentY);
      currentY += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');

      // Criar boxes para estatísticas
      const stats = [
        ['Total de Atendimentos', employee.total_attendances.toString()],
        ['Atendimentos Validados', employee.completed_attendances.toString()],
        ['Pendentes de Validação', employee.pending_attendances.toString()],
        ['Horas Trabalhadas', `${employee.total_hours_worked.toFixed(1)}h`],
        ['Tempo Total Logado', formatMinutesToHours(employee.total_time_logged)],
        ['Total a Receber', formatCurrency(employee.total_amount_to_receive)]
      ];

      const boxWidth = (pageWidth - 2 * margin - 10) / 2;
      const boxHeight = 15;
      let col = 0;
      let row = 0;

      stats.forEach(([label, value]) => {
        const x = margin + col * (boxWidth + 5);
        const y = currentY + row * (boxHeight + 5);

        pdf.setFillColor(240, 240, 240);
        pdf.rect(x, y, boxWidth, boxHeight, 'F');
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text(label, x + 2, y + 5);
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text(value, x + 2, y + 11);

        col++;
        if (col >= 2) {
          col = 0;
          row++;
        }
      });

      currentY += Math.ceil(stats.length / 2) * (boxHeight + 5) + 10;

      // Atendimentos
      checkSpace(50);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('HISTÓRICO DE ATENDIMENTOS', margin, currentY);
      currentY += 10;

      if (attendances.length === 0) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Nenhum atendimento registrado', margin, currentY);
        currentY += 10;
      } else {
        // Cabeçalho da tabela
        pdf.setFillColor(230, 230, 230);
        pdf.rect(margin, currentY, pageWidth - 2 * margin, 8, 'F');
        
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Data', margin + 2, currentY + 5);
        pdf.text('Paciente', margin + 25, currentY + 5);
        pdf.text('Tipo', margin + 75, currentY + 5);
        pdf.text('Duração', margin + 110, currentY + 5);
        pdf.text('Status', margin + 135, currentY + 5);
        pdf.text('Valor', margin + 165, currentY + 5);
        currentY += 10;

        // Dados da tabela (últimos 15 atendimentos)
        pdf.setFont('helvetica', 'normal');
        const recentAttendances = attendances.slice(0, 15);
        
        recentAttendances.forEach((att) => {
          checkSpace(7);
          
          pdf.text(format(new Date(att.session_date), 'dd/MM/yyyy'), margin + 2, currentY);
          pdf.text(att.patient_name.substring(0, 20), margin + 25, currentY);
          pdf.text(att.attendance_type.substring(0, 15), margin + 75, currentY);
          pdf.text(`${att.session_duration || 0} min`, margin + 110, currentY);
          pdf.text(
            att.validation_status === 'validated' ? 'Validado' :
            att.validation_status === 'rejected' ? 'Rejeitado' : 'Pendente',
            margin + 135, currentY
          );
          pdf.text(formatCurrency(att.professional_amount || 0), margin + 165, currentY);
          
          currentY += 6;
        });

        if (attendances.length > 15) {
          currentY += 5;
          pdf.setFont('helvetica', 'italic');
          pdf.text(`... e mais ${attendances.length - 15} atendimentos`, margin, currentY);
        }
      }

      currentY += 10;

      // Registro de Ponto
      checkSpace(50);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('REGISTRO DE PONTO', margin, currentY);
      currentY += 10;

      if (timesheet.length === 0) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Nenhum registro de ponto', margin, currentY);
        currentY += 10;
      } else {
        // Cabeçalho da tabela
        pdf.setFillColor(230, 230, 230);
        pdf.rect(margin, currentY, pageWidth - 2 * margin, 8, 'F');
        
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Data', margin + 2, currentY + 5);
        pdf.text('Entrada', margin + 35, currentY + 5);
        pdf.text('Saída', margin + 70, currentY + 5);
        pdf.text('Total', margin + 105, currentY + 5);
        pdf.text('Status', margin + 140, currentY + 5);
        currentY += 10;

        // Dados da tabela (últimos 20 registros)
        pdf.setFont('helvetica', 'normal');
        const recentTimesheet = timesheet.slice(0, 20);
        
        recentTimesheet.forEach((entry) => {
          checkSpace(7);
          
          const date = entry.date.includes('T') ? new Date(entry.date) : new Date(entry.date + 'T12:00:00');
          pdf.text(format(date, 'dd/MM/yyyy'), margin + 2, currentY);
          pdf.text(entry.clock_in ? format(new Date(entry.clock_in), 'HH:mm') : '-', margin + 35, currentY);
          pdf.text(entry.clock_out ? format(new Date(entry.clock_out), 'HH:mm') : '-', margin + 70, currentY);
          pdf.text(entry.total_hours ? formatMinutesToHours(Math.round(entry.total_hours * 60)) : '0min', margin + 105, currentY);
          pdf.text(
            entry.status === 'approved' ? 'Aprovado' :
            entry.status === 'rejected' ? 'Rejeitado' : 'Pendente',
            margin + 140, currentY
          );
          
          currentY += 6;
        });

        if (timesheet.length > 20) {
          currentY += 5;
          pdf.setFont('helvetica', 'italic');
          pdf.text(`... e mais ${timesheet.length - 20} registros`, margin, currentY);
        }
      }

      // Rodapé em todas as páginas
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(128, 128, 128);
        pdf.text(
          `Página ${i} de ${totalPages} - Fundação Dom Bosco`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Salvar PDF
      const fileName = `relatorio-${employee.name.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Relatório Gerado!",
        description: "O PDF foi baixado com sucesso."
      });
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível gerar o relatório."
      });
    }
  };

  return (
    <Button onClick={generatePDF} variant="outline" className="gap-2">
      <FileText className="h-4 w-4" />
      Gerar Relatório PDF
    </Button>
  );
}
