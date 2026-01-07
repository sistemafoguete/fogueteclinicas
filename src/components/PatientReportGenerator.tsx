import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, Printer, Star, Calendar, Clock, User } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
  treatment_expectations?: string;
  clinical_observations?: string;
  medical_history?: string;
  current_symptoms?: string;
  treatment_progress?: string;
  is_active: boolean;
  created_at: string;
}

interface PatientReportGeneratorProps {
  client: Client;
  isOpen: boolean;
  onClose: () => void;
}

interface AttendanceRecord {
  id: string;
  start_time: string;
  end_time: string;
  session_duration?: number;
  attendance_type: string;
  professional_name: string;
  session_notes?: string;
  observations?: string;
  techniques_used?: string;
  patient_response?: string;
  next_session_plan?: string;
  materials_used?: any[];
  amount_charged?: number;
  attachments?: any[];
  quality_rating?: number;
  cooperation_rating?: number;
  goals_rating?: number;
  effort_rating?: number;
}

export function PatientReportGenerator({ client, isOpen, onClose }: PatientReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employeeReports, setEmployeeReports] = useState<any[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && client?.id) {
      loadAttendanceData();
    }
  }, [isOpen, client?.id]);

  const loadAttendanceData = async () => {
    setLoading(true);
    try {
      // Carregar attendance reports (atendimentos concluídos com todas as informações)
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_reports')
        .select(`
          id,
          start_time,
          end_time,
          session_duration,
          attendance_type,
          professional_name,
          session_notes,
          observations,
          techniques_used,
          patient_response,
          next_session_plan,
          materials_used,
          amount_charged,
          attachments,
          created_at
        `)
        .eq('client_id', client.id)
        .order('start_time', { ascending: false });

      if (attendanceError) throw attendanceError;

      // Carregar employee reports (relatórios detalhados com avaliações)
      const { data: employeeData, error: employeeError } = await supabase
        .from('employee_reports')
        .select(`
          id,
          session_date,
          session_type,
          session_duration,
          professional_notes,
          techniques_used,
          session_objectives,
          patient_response,
          next_session_plan,
          materials_used,
          quality_rating,
          effort_rating,
          patient_cooperation,
          goal_achievement,
          attachments,
          materials_cost,
          profiles:employee_id (name)
        `)
        .eq('client_id', client.id)
        .order('session_date', { ascending: false });

      if (employeeError) throw employeeError;

      // Carregar medical records
      const { data: medicalData, error: medicalError } = await supabase
        .from('medical_records')
        .select(`
          id,
          session_date,
          session_type,
          progress_notes,
          treatment_plan,
          symptoms,
          session_duration,
          profiles:employee_id (name)
        `)
        .eq('client_id', client.id)
        .order('session_date', { ascending: false });

      if (medicalError) throw medicalError;

      // Carregar pagamentos do cliente
      const { data: paymentData, error: paymentError } = await supabase
        .from('client_payments')
        .select(`
          id,
          description,
          total_amount,
          amount_paid,
          amount_remaining,
          status,
          payment_type,
          payment_method,
          installments_total,
          installments_paid,
          created_at,
          due_date,
          notes,
          payment_installments (
            id,
            installment_number,
            amount,
            paid_amount,
            due_date,
            paid_date,
            status,
            payment_method
          )
        `)
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (paymentError) throw paymentError;

      setAttendanceRecords((attendanceData || []).map(record => ({
        ...record,
        materials_used: Array.isArray(record.materials_used) ? record.materials_used : [],
        attachments: Array.isArray(record.attachments) ? record.attachments : []
      })));
      setEmployeeReports((employeeData || []).map(report => ({
        ...report,
        materials_used: Array.isArray(report.materials_used) ? report.materials_used : [],
        attachments: Array.isArray(report.attachments) ? report.attachments : []
      })));
      setMedicalRecords(medicalData || []);
      setPaymentRecords(paymentData || []);

    } catch (error) {
      console.error('Error loading attendance data:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados de atendimento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Não informado';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatBirthDate = (dateString?: string) => {
    if (!dateString) return 'Não informado';
    const birthDate = new Date(dateString);
    const today = new Date();
    const age = Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    return `${birthDate.toLocaleDateString('pt-BR')} (${age} anos)`;
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const reportElement = document.getElementById('patient-report');
      if (!reportElement) return;

      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Relatorio_${client.name.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
      
      toast({
        title: "Relatório gerado com sucesso!",
        description: "O arquivo PDF foi baixado.",
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro ao gerar relatório",
        description: "Houve um problema ao gerar o PDF. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const printReport = () => {
    const reportElement = document.getElementById('patient-report');
    if (!reportElement) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório - ${client.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .report-header { text-align: center; margin-bottom: 30px; }
            .logo { max-width: 200px; margin-bottom: 20px; }
            .report-section { margin-bottom: 20px; }
            .section-title { font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; }
            .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
            .field { display: flex; flex-direction: column; }
            .field-label { font-weight: bold; margin-bottom: 5px; }
            .field-value { padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
            .full-width { grid-column: span 2; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${reportElement.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Relatório do Paciente - {client.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4 no-print">
          <Button onClick={generatePDF} disabled={isGenerating} className="gap-2">
            <Download className="h-4 w-4" />
            {isGenerating ? 'Gerando...' : 'Baixar PDF'}
          </Button>
          <Button onClick={printReport} variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </div>

        <div id="patient-report" className="bg-white p-8 space-y-6">
          {/* Cabeçalho */}
          <div className="report-header text-center">
            <img src={logoImage} alt="Fundação Dom Bosco" className="mx-auto max-w-[200px] mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">RELATÓRIO DO PACIENTE</h1>
            <p className="text-sm text-gray-600 mt-2">
              Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
            </p>
          </div>

          <Separator />

          {/* Dados Pessoais */}
          <div className="report-section">
            <h2 className="section-title text-lg font-semibold text-gray-900 border-b border-gray-300 pb-2 mb-4">
              DADOS PESSOAIS
            </h2>
            <div className="field-grid grid grid-cols-2 gap-4">
              <div className="field">
                <div className="field-label font-medium text-gray-700">Nome Completo:</div>
                <div className="field-value p-2 border border-gray-200 rounded">{client.name}</div>
              </div>
              <div className="field">
                <div className="field-label font-medium text-gray-700">CPF:</div>
                <div className="field-value p-2 border border-gray-200 rounded">{client.cpf || 'Não informado'}</div>
              </div>
              <div className="field">
                <div className="field-label font-medium text-gray-700">Data de Nascimento:</div>
                <div className="field-value p-2 border border-gray-200 rounded">{formatBirthDate(client.birth_date)}</div>
              </div>
              <div className="field">
                <div className="field-label font-medium text-gray-700">Telefone:</div>
                <div className="field-value p-2 border border-gray-200 rounded">{client.phone || 'Não informado'}</div>
              </div>
              <div className="field">
                <div className="field-label font-medium text-gray-700">Email:</div>
                <div className="field-value p-2 border border-gray-200 rounded">{client.email || 'Não informado'}</div>
              </div>
              <div className="field">
                <div className="field-label font-medium text-gray-700">Unidade:</div>
                <div className="field-value p-2 border border-gray-200 rounded">
                  <Badge variant={
                    client.unit === 'madre' ? 'default' : 
                    client.unit === 'floresta' ? 'secondary' :
                    'outline'
                  }>
                    {client.unit === 'madre' ? 'MADRE' : 
                     client.unit === 'floresta' ? 'Floresta' :
                     client.unit === 'atendimento_floresta' ? 'Atendimento Floresta' :
                     client.unit || 'N/A'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="field full-width mt-4">
              <div className="field-label font-medium text-gray-700">Endereço:</div>
              <div className="field-value p-2 border border-gray-200 rounded">{client.address || 'Não informado'}</div>
            </div>
          </div>

          {/* Responsável */}
          {(client.responsible_name || client.responsible_phone) && (
            <div className="report-section">
              <h2 className="section-title text-lg font-semibold text-gray-900 border-b border-gray-300 pb-2 mb-4">
                RESPONSÁVEL
              </h2>
              <div className="field-grid grid grid-cols-2 gap-4">
                <div className="field">
                  <div className="field-label font-medium text-gray-700">Nome do Responsável:</div>
                  <div className="field-value p-2 border border-gray-200 rounded">{client.responsible_name || 'Não informado'}</div>
                </div>
                <div className="field">
                  <div className="field-label font-medium text-gray-700">Telefone do Responsável:</div>
                  <div className="field-value p-2 border border-gray-200 rounded">{client.responsible_phone || 'Não informado'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Informações Clínicas */}
          <div className="report-section">
            <h2 className="section-title text-lg font-semibold text-gray-900 border-b border-gray-300 pb-2 mb-4">
              INFORMAÇÕES CLÍNICAS
            </h2>
            <div className="space-y-4">
              <div className="field">
                <div className="field-label font-medium text-gray-700">Diagnóstico:</div>
                <div className="field-value p-2 border border-gray-200 rounded min-h-[60px]">{client.diagnosis || 'Não informado'}</div>
              </div>
              <div className="field">
                <div className="field-label font-medium text-gray-700">Queixa Neuropsicológica:</div>
                <div className="field-value p-2 border border-gray-200 rounded min-h-[60px]">{client.neuropsych_complaint || 'Não informado'}</div>
              </div>
              <div className="field">
                <div className="field-label font-medium text-gray-700">Sintomas Atuais:</div>
                <div className="field-value p-2 border border-gray-200 rounded min-h-[60px]">{client.current_symptoms || 'Não informado'}</div>
              </div>
              <div className="field">
                <div className="field-label font-medium text-gray-700">Histórico Médico:</div>
                <div className="field-value p-2 border border-gray-200 rounded min-h-[60px]">{client.medical_history || 'Não informado'}</div>
              </div>
            </div>
          </div>

          {/* Tratamento */}
          <div className="report-section">
            <h2 className="section-title text-lg font-semibold text-gray-900 border-b border-gray-300 pb-2 mb-4">
              TRATAMENTO
            </h2>
            <div className="space-y-4">
              <div className="field">
                <div className="field-label font-medium text-gray-700">Expectativas do Tratamento:</div>
                <div className="field-value p-2 border border-gray-200 rounded min-h-[60px]">{client.treatment_expectations || 'Não informado'}</div>
              </div>
              <div className="field">
                <div className="field-label font-medium text-gray-700">Progresso do Tratamento:</div>
                <div className="field-value p-2 border border-gray-200 rounded min-h-[60px]">{client.treatment_progress || 'Não informado'}</div>
              </div>
              <div className="field">
                <div className="field-label font-medium text-gray-700">Observações Clínicas:</div>
                <div className="field-value p-2 border border-gray-200 rounded min-h-[60px]">{client.clinical_observations || 'Não informado'}</div>
              </div>
            </div>
          </div>

          {/* Informações Administrativas */}
          <div className="report-section">
            <h2 className="section-title text-lg font-semibold text-gray-900 border-b border-gray-300 pb-2 mb-4">
              INFORMAÇÕES ADMINISTRATIVAS
            </h2>
            <div className="field-grid grid grid-cols-2 gap-4">
              <div className="field">
                <div className="field-label font-medium text-gray-700">Status:</div>
                <div className="field-value p-2 border border-gray-200 rounded">
                  <Badge variant={client.is_active ? 'default' : 'destructive'}>
                    {client.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>
              <div className="field">
                <div className="field-label font-medium text-gray-700">Data de Cadastro:</div>
                <div className="field-value p-2 border border-gray-200 rounded">{formatDate(client.created_at)}</div>
              </div>
            </div>
          </div>

          {/* Histórico Financeiro */}
          {paymentRecords.length > 0 && (
            <div className="report-section">
              <h2 className="section-title text-lg font-semibold text-gray-900 border-b border-gray-300 pb-2 mb-4">
                HISTÓRICO FINANCEIRO
              </h2>
              <div className="space-y-4">
                {/* Resumo Financeiro */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3">Resumo Geral</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Total Cobrado:</div>
                      <div className="text-lg font-bold text-gray-900">
                        R$ {paymentRecords.reduce((sum, p) => sum + (p.total_amount || 0), 0).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Total Pago:</div>
                      <div className="text-lg font-bold text-green-600">
                        R$ {paymentRecords.reduce((sum, p) => sum + (p.amount_paid || 0), 0).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Total Pendente:</div>
                      <div className="text-lg font-bold text-orange-600">
                        R$ {paymentRecords.reduce((sum, p) => sum + (p.amount_remaining || 0), 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detalhamento dos Pagamentos */}
                {paymentRecords.map((payment) => (
                  <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-800">{payment.description || 'Pagamento'}</h3>
                      <Badge variant={
                        payment.status === 'completed' ? 'default' :
                        payment.status === 'partial' ? 'secondary' : 'outline'
                      }>
                        {payment.status === 'completed' ? 'Concluído' :
                         payment.status === 'partial' ? 'Parcial' : 'Pendente'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Valor Total:</span> R$ {payment.total_amount?.toFixed(2)}
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Valor Pago:</span> R$ {payment.amount_paid?.toFixed(2)}
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Tipo:</span> {payment.payment_type === 'installments' ? 'Parcelado' : payment.payment_type === 'upfront' ? 'À Vista' : payment.payment_type}
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Método:</span> {
                          payment.payment_method === 'credit_card' ? 'Cartão de Crédito' :
                          payment.payment_method === 'debit_card' ? 'Cartão de Débito' :
                          payment.payment_method === 'pix' ? 'PIX' :
                          payment.payment_method === 'cash' ? 'Dinheiro' :
                          payment.payment_method === 'bank_transfer' ? 'Transferência' : payment.payment_method
                        }
                      </div>
                      {payment.installments_total > 1 && (
                        <>
                          <div>
                            <span className="font-medium text-gray-600">Parcelas:</span> {payment.installments_paid}/{payment.installments_total}
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Restante:</span> R$ {payment.amount_remaining?.toFixed(2)}
                          </div>
                        </>
                      )}
                      <div>
                        <span className="font-medium text-gray-600">Data de Cadastro:</span> {formatDate(payment.created_at)}
                      </div>
                      {payment.due_date && (
                        <div>
                          <span className="font-medium text-gray-600">Vencimento:</span> {formatDate(payment.due_date)}
                        </div>
                      )}
                    </div>

                    {payment.notes && (
                      <div className="mb-3">
                        <div className="font-medium text-gray-600 text-sm mb-1">Observações:</div>
                        <div className="text-sm bg-gray-50 p-2 rounded">{payment.notes}</div>
                      </div>
                    )}

                    {/* Detalhamento das Parcelas */}
                    {payment.payment_installments && payment.payment_installments.length > 0 && (
                      <div className="mt-4">
                        <div className="font-medium text-gray-600 text-sm mb-2">Detalhamento das Parcelas:</div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border border-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left border-b">Parcela</th>
                                <th className="px-3 py-2 text-left border-b">Valor</th>
                                <th className="px-3 py-2 text-left border-b">Pago</th>
                                <th className="px-3 py-2 text-left border-b">Vencimento</th>
                                <th className="px-3 py-2 text-left border-b">Pag. em</th>
                                <th className="px-3 py-2 text-left border-b">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {payment.payment_installments
                                .sort((a: any, b: any) => a.installment_number - b.installment_number)
                                .map((installment: any) => (
                                <tr key={installment.id} className="border-b">
                                  <td className="px-3 py-2">{installment.installment_number}</td>
                                  <td className="px-3 py-2">R$ {installment.amount?.toFixed(2)}</td>
                                  <td className="px-3 py-2">R$ {(installment.paid_amount || 0).toFixed(2)}</td>
                                  <td className="px-3 py-2">{formatDate(installment.due_date)}</td>
                                  <td className="px-3 py-2">{installment.paid_date ? formatDate(installment.paid_date) : '-'}</td>
                                  <td className="px-3 py-2">
                                    <Badge variant={
                                      installment.status === 'paid' ? 'default' :
                                      installment.status === 'overdue' ? 'destructive' : 'outline'
                                    } className="text-[10px]">
                                      {installment.status === 'paid' ? 'Pago' :
                                       installment.status === 'overdue' ? 'Vencido' : 'Pendente'}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Histórico de Atendimentos Detalhados */}
          {(attendanceRecords.length > 0 || employeeReports.length > 0) && (
            <div className="report-section">
              <h2 className="section-title text-lg font-semibold text-gray-900 border-b border-gray-300 pb-2 mb-4">
                HISTÓRICO DE ATENDIMENTOS DETALHADOS
              </h2>
              {loading ? (
                <div className="text-center py-4">Carregando atendimentos...</div>
              ) : (
                <div className="space-y-6">
                  {/* Atendimentos Concluídos (attendance_reports) */}
                  {attendanceRecords.map((record, index) => (
                    <div key={`attendance_${record.id}`} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-800">{record.attendance_type || 'Atendimento'}</h3>
                        <Badge variant="outline">
                          {formatDate(record.start_time)} - {record.professional_name}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-sm">
                          <span className="font-medium text-gray-600">Início:</span> {new Date(record.start_time).toLocaleString('pt-BR')}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium text-gray-600">Fim:</span> {new Date(record.end_time).toLocaleString('pt-BR')}
                        </div>
                        {record.session_duration && (
                          <div className="text-sm">
                            <span className="font-medium text-gray-600">Duração:</span> {record.session_duration} minutos
                          </div>
                        )}
                        {record.amount_charged && record.amount_charged > 0 && (
                          <div className="text-sm">
                            <span className="font-medium text-gray-600">Valor:</span> R$ {record.amount_charged.toFixed(2)}
                          </div>
                        )}
                      </div>

                      {record.observations && (
                        <div className="mb-3">
                          <div className="font-medium text-gray-600 text-sm mb-1">Observações:</div>
                          <div className="text-sm bg-gray-50 p-2 rounded">{record.observations}</div>
                        </div>
                      )}

                      {record.techniques_used && (
                        <div className="mb-3">
                          <div className="font-medium text-gray-600 text-sm mb-1">Técnicas Utilizadas:</div>
                          <div className="text-sm bg-gray-50 p-2 rounded">{record.techniques_used}</div>
                        </div>
                      )}

                      {record.patient_response && (
                        <div className="mb-3">
                          <div className="font-medium text-gray-600 text-sm mb-1">Resposta do Paciente:</div>
                          <div className="text-sm bg-gray-50 p-2 rounded">{record.patient_response}</div>
                        </div>
                      )}

                      {record.next_session_plan && (
                        <div className="mb-3">
                          <div className="font-medium text-gray-600 text-sm mb-1">Plano para Próxima Sessão:</div>
                          <div className="text-sm bg-gray-50 p-2 rounded">{record.next_session_plan}</div>
                        </div>
                      )}

                      {record.materials_used && record.materials_used.length > 0 && (
                        <div className="mb-3">
                          <div className="font-medium text-gray-600 text-sm mb-1">Materiais Utilizados:</div>
                          <div className="space-y-1">
                            {record.materials_used.map((material: any, idx: number) => (
                              <div key={idx} className="text-sm bg-gray-50 p-2 rounded flex justify-between">
                                <span>{material.name || material}</span>
                                {material.quantity && material.unit && (
                                  <span className="text-gray-600">{material.quantity} {material.unit}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {record.attachments && record.attachments.length > 0 && (
                        <div className="mb-3">
                          <div className="font-medium text-gray-600 text-sm mb-1">Documentos Anexos:</div>
                          <div className="space-y-1">
                            {record.attachments.map((attachment: any, idx: number) => (
                              <div key={idx} className="text-sm bg-gray-50 p-2 rounded">{attachment.name}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Relatórios de Sessão (employee_reports) */}
                  {employeeReports.map((report, index) => (
                    <div key={`report_${report.id}`} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-800">{report.session_type || 'Sessão Terapêutica'}</h3>
                        <Badge variant="outline">
                          {formatDate(report.session_date)} - {report.profiles?.name || 'Profissional'}
                        </Badge>
                      </div>

                      {/* Avaliações da sessão */}
                      {(report.quality_rating || report.patient_cooperation || report.goal_achievement || report.effort_rating) && (
                        <div className="mb-4 p-3 bg-blue-50 rounded">
                          <div className="font-medium text-gray-600 text-sm mb-2">Avaliação da Sessão:</div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {report.quality_rating && (
                              <div className="flex items-center justify-between">
                                <span>Qualidade Geral:</span>
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <span key={star} className={star <= report.quality_rating ? 'text-yellow-400' : 'text-gray-300'}>★</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {report.patient_cooperation && (
                              <div className="flex items-center justify-between">
                                <span>Cooperação:</span>
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <span key={star} className={star <= report.patient_cooperation ? 'text-yellow-400' : 'text-gray-300'}>★</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {report.goal_achievement && (
                              <div className="flex items-center justify-between">
                                <span>Objetivos:</span>
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <span key={star} className={star <= report.goal_achievement ? 'text-yellow-400' : 'text-gray-300'}>★</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {report.effort_rating && (
                              <div className="flex items-center justify-between">
                                <span>Esforço:</span>
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <span key={star} className={star <= report.effort_rating ? 'text-yellow-400' : 'text-gray-300'}>★</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {report.session_duration && (
                        <div className="mb-3">
                          <span className="font-medium text-gray-600 text-sm">Duração:</span> {report.session_duration} minutos
                        </div>
                      )}

                      {report.session_objectives && (
                        <div className="mb-3">
                          <div className="font-medium text-gray-600 text-sm mb-1">Objetivos da Sessão:</div>
                          <div className="text-sm bg-gray-50 p-2 rounded">{report.session_objectives}</div>
                        </div>
                      )}

                      {report.professional_notes && (
                        <div className="mb-3">
                          <div className="font-medium text-gray-600 text-sm mb-1">Observações Profissionais:</div>
                          <div className="text-sm bg-gray-50 p-2 rounded">{report.professional_notes}</div>
                        </div>
                      )}

                      {report.techniques_used && (
                        <div className="mb-3">
                          <div className="font-medium text-gray-600 text-sm mb-1">Técnicas Utilizadas:</div>
                          <div className="text-sm bg-gray-50 p-2 rounded">{report.techniques_used}</div>
                        </div>
                      )}

                      {report.patient_response && (
                        <div className="mb-3">
                          <div className="font-medium text-gray-600 text-sm mb-1">Resposta do Paciente:</div>
                          <div className="text-sm bg-gray-50 p-2 rounded">{report.patient_response}</div>
                        </div>
                      )}

                      {report.next_session_plan && (
                        <div className="mb-3">
                          <div className="font-medium text-gray-600 text-sm mb-1">Plano para Próxima Sessão:</div>
                          <div className="text-sm bg-gray-50 p-2 rounded">{report.next_session_plan}</div>
                        </div>
                      )}

                      {report.materials_used && report.materials_used.length > 0 && (
                        <div className="mb-3">
                          <div className="font-medium text-gray-600 text-sm mb-1">Materiais Utilizados:</div>
                          <div className="space-y-1">
                            {report.materials_used.map((material: any, idx: number) => (
                              <div key={idx} className="text-sm bg-gray-50 p-2 rounded flex justify-between">
                                <span>{material.name || material}</span>
                                {material.total_cost && (
                                  <span className="text-gray-600">R$ {material.total_cost.toFixed(2)}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {report.materials_cost && report.materials_cost > 0 && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-600">Custo Total dos Materiais:</span> R$ {report.materials_cost.toFixed(2)}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Registros Médicos (medical_records) */}
                  {medicalRecords.map((record, index) => (
                    <div key={`medical_${record.id}`} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-800">{record.session_type || 'Consulta Médica'}</h3>
                        <Badge variant="secondary">
                          {formatDate(record.session_date)} - {record.profiles?.name || 'Profissional'}
                        </Badge>
                      </div>

                      {record.session_duration && (
                        <div className="mb-3">
                          <span className="font-medium text-gray-600 text-sm">Duração:</span> {record.session_duration} minutos
                        </div>
                      )}

                      {record.symptoms && (
                        <div className="mb-3">
                          <div className="font-medium text-gray-600 text-sm mb-1">Sintomas:</div>
                          <div className="text-sm bg-gray-50 p-2 rounded">{record.symptoms}</div>
                        </div>
                      )}

                      {record.progress_notes && (
                        <div className="mb-3">
                          <div className="font-medium text-gray-600 text-sm mb-1">Notas de Progresso:</div>
                          <div className="text-sm bg-gray-50 p-2 rounded">{record.progress_notes}</div>
                        </div>
                      )}

                      {record.treatment_plan && (
                        <div className="mb-3">
                          <div className="font-medium text-gray-600 text-sm mb-1">Plano de Tratamento:</div>
                          <div className="text-sm bg-gray-50 p-2 rounded">{record.treatment_plan}</div>
                        </div>
                      )}
                    </div>
                  ))}

                  {attendanceRecords.length === 0 && employeeReports.length === 0 && medicalRecords.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Nenhum atendimento registrado ainda.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Rodapé */}
          <div className="report-footer text-center pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Fundação Dom Bosco - Sistema de Gestão de Pacientes
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Este relatório foi gerado automaticamente pelo sistema em {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}