import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Download, Printer, Eye, Plus, Shield } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { supabase } from '@/integrations/supabase/client';
import contractLogo from '@/assets/contract-page5-logo.png';

interface Client {
  id: string;
  name: string;
  cpf?: string;
  address?: string;
  responsible_name?: string;
  responsible_phone?: string;
  responsible_cpf?: string;
  email?: string;
  phone?: string;
}

interface ContractData {
  contratante: string;
  contratanteCpf: string;
  beneficiario: string;
  beneficiarioCpf: string;
  endereco: string;
  valorTotal: string;
  valorExtenso: string;
  formaPagamento: string;
  valorVista?: string;
  valorParcela?: string;
  numeroParcelas?: string;
  datasPagamento?: string;
  cartaoCredito?: {
    valor: string;
    parcelas: string;
  };
  data: string;
  mes: string;
  ano: string;
}

interface ContractGeneratorProps {
  client: Client;
}

export const ContractGenerator = ({ client }: ContractGeneratorProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { userRole, loading: roleLoading } = useRolePermissions();
  const [isOpen, setIsOpen] = useState(false);
  const [contractData, setContractData] = useState<ContractData>({
    contratante: client.responsible_name || client.name || '',
    contratanteCpf: client.responsible_cpf || client.cpf || '',
    beneficiario: client.name || '',
    beneficiarioCpf: client.cpf || '',
    endereco: client.address || '',
    valorTotal: '1.600,00',
    valorExtenso: 'mil e seiscentos reais',
    formaPagamento: 'vista',
    data: new Date().getDate().toString(),
    mes: new Date().toLocaleString('pt-BR', { month: 'long' }),
    ano: new Date().getFullYear().toString()
  });

  const contractRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (field: keyof ContractData, value: string) => {
    setContractData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const parseContractValue = (value: string): number => {
    // Converte valores como "1.600,00" para 1600.00
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 1600.00;
  };

  const getContractDate = (): string => {
    // Converte a data do contrato (dia, mês por extenso, ano) para formato ISO (YYYY-MM-DD)
    const monthMap: { [key: string]: string } = {
      'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
      'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
      'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
    };
    
    const day = contractData.data.padStart(2, '0');
    const month = monthMap[contractData.mes.toLowerCase()] || '01';
    const year = contractData.ano;
    
    return `${year}-${month}-${day}`;
  };

  const createFinancialRecord = async () => {
    const contractValueNumber = parseContractValue(contractData.valorTotal);
    const contractDate = getContractDate();
    
    console.log('📊 Criando registro financeiro do contrato:', {
      amount: contractValueNumber,
      beneficiario: contractData.beneficiario,
      clientId: client.id,
      date: contractDate
    });
    
    const { error } = await supabase
      .from('financial_records')
      .insert([{
        type: 'income',
        category: 'evaluation',
        description: `Avaliação Neuropsicológica - ${contractData.beneficiario}`,
        amount: contractValueNumber,
        date: contractDate,
        payment_method: 'contract',
        client_id: client.id,
        created_by: user?.id,
        notes: `Contrato gerado - Pagamento registrado`
      }]);

    if (error) {
      console.error('❌ Erro ao criar registro financeiro:', error);
      throw error;
    }

    console.log('✅ Registro financeiro criado com sucesso');
  };

  const generatePDF = async () => {
    if (!contractRef.current) return;

    try {
      const canvas = await html2canvas(contractRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;
      let pageNumber = 0;

      // Adicionar logo na primeira página
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      pdf.addImage(contractLogo, 'PNG', 10, 10, 30, 15); // Logo no topo esquerdo
      heightLeft -= pageHeight;
      pageNumber++;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        pdf.addImage(contractLogo, 'PNG', 10, 10, 30, 15); // Logo em todas as páginas
        heightLeft -= pageHeight;
        pageNumber++;
      }
      
      pdf.save(`Contrato_${contractData.beneficiario || 'Neuropsicologia'}.pdf`);

      // Criar registro financeiro automaticamente
      await createFinancialRecord();
      
      toast({
        title: "Contrato gerado!",
        description: `PDF baixado e registro financeiro de R$ ${contractData.valorTotal} criado automaticamente.`,
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível gerar o PDF.",
      });
    }
  };

  const printContract = async () => {
    if (!contractRef.current) return;
    
    try {
      // Buscar dados do usuário atual para registrar quem imprimiu
      const { data: currentUser, error: userError } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user?.id)
        .single();

      if (userError) {
        console.error('Erro ao buscar usuário:', userError);
      }

      const userName = currentUser?.name || 'Usuário não identificado';
      const contractValueNumber = parseContractValue(contractData.valorTotal);
      const contractDate = getContractDate();
      const contractDateTime = `${contractDate}T10:00:00Z`; // Data do contrato às 10h
      
      // Criar registro no attendance_reports
      const { data: attendanceReport, error: attendanceError } = await supabase
        .from('attendance_reports')
        .insert([{
          client_id: client.id,
          employee_id: user?.id,
          patient_name: contractData.beneficiario || client.name,
          professional_name: userName,
          attendance_type: 'Avaliação Neuropsicológica',
          start_time: contractDateTime,
          end_time: `${contractDate}T11:00:00Z`, // 1 hora depois
          session_duration: 60,
          amount_charged: contractValueNumber,
          professional_amount: 0, // Pode ser definido depois
          institution_amount: contractValueNumber,
          status: 'completed',
          validation_status: 'validated',
          session_notes: `Contrato de Avaliação Neuropsicológica gerado e impresso por ${userName}`,
          created_by: user?.id,
          completed_by: user?.id,
          completed_by_name: userName,
          validated_by: user?.id,
          validated_by_name: userName,
          validated_at: contractDateTime
        }])
        .select()
        .single();

      if (attendanceError) {
        console.error('Erro ao criar relatório de atendimento:', attendanceError);
      }

      // Criar registro de pagamento do cliente
      const { error: paymentError } = await supabase
        .from('client_payments')
        .insert([{
          client_id: client.id,
          payment_type: 'Avaliação Neuropsicológica',
          total_amount: contractValueNumber,
          amount_paid: contractValueNumber,
          amount_remaining: 0,
          status: 'completed',
          payment_method: 'Contrato',
          description: `Pagamento de Avaliação Neuropsicológica - Contrato impresso por ${userName}`,
          unit: 'floresta',
          created_by: user?.id,
          installments_total: 1,
          installments_paid: 1
        }]);

      if (paymentError) {
        console.error('Erro ao criar registro de pagamento:', paymentError);
      }

      // Criar registro financeiro automático
      const { error: autoFinancialError } = await supabase
        .from('automatic_financial_records')
        .insert([{
          patient_id: client.id,
          patient_name: contractData.beneficiario || client.name,
          professional_id: user?.id,
          professional_name: userName,
          amount: contractValueNumber,
          transaction_type: 'income',
          payment_method: 'Contrato',
          description: `Avaliação Neuropsicológica - Contrato impresso por ${userName}`,
          origin_type: 'contract',
          origin_id: attendanceReport?.id,
          attendance_report_id: attendanceReport?.id,
          created_by: user?.id,
          created_by_name: userName,
          payment_date: contractDateTime,
          metadata: {
            contract_data: JSON.parse(JSON.stringify(contractData)),
            printed_by: userName,
            printed_at: contractDateTime,
            contract_type: 'Avaliação Neuropsicológica',
            contract_date: contractDate
          } as any
        }]);

      if (autoFinancialError) {
        console.error('Erro ao criar registro financeiro automático:', autoFinancialError);
      }

      // Criar registro financeiro tradicional
      try {
        await createFinancialRecord();
      } catch (error) {
        console.error('❌ Falha ao criar registro financeiro:', error);
        toast({
          variant: "destructive",
          title: "Aviso",
          description: "Contrato processado mas houve erro ao criar registro financeiro. Verifique o financeiro.",
        });
      }

      // Abrir janela de impressão
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Contrato de Avaliação Neuropsicológica</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; font-size: 14px; line-height: 1.6; }
              .contract { max-width: 800px; margin: 0 auto; }
              h1 { text-align: center; margin-bottom: 30px; }
              h2 { margin-top: 25px; margin-bottom: 10px; }
              h3 { margin-top: 20px; margin-bottom: 8px; }
              p { margin-bottom: 12px; text-align: justify; }
              .underline { border-bottom: 1px solid black; display: inline-block; min-width: 200px; }
              .signatures { margin-top: 50px; display: flex; justify-content: space-between; }
              .signature { text-align: center; }
              .signature-line { border-bottom: 1px solid black; width: 300px; padding-top: 50px; margin-bottom: 5px; }
              .print-info { margin-bottom: 20px; text-align: right; font-size: 10px; color: #666; }
              @media print { 
                body { margin: 0; padding: 15px; font-size: 12px; }
                .print-info { font-size: 8px; }
              }
            </style>
          </head>
          <body>
            <div class="print-info">
              Impresso por: ${userName} em ${new Date().toLocaleString('pt-BR')}
            </div>
            ${contractRef.current.innerHTML}
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();

      toast({
        title: "Contrato processado com sucesso!",
        description: `Contrato impresso por ${userName}. Registros financeiros, de atendimento e de pagamento criados automaticamente.`,
      });

    } catch (error) {
      console.error('Erro ao processar contrato:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao processar o contrato. Tente novamente.",
      });
    }
  };

  const handlePreviewContract = () => {
    const newWindow = window.open('', '_blank');
    if (!newWindow || !contractRef.current) return;
    
    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Contrato - ${contractData.beneficiario}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; font-size: 14px; line-height: 1.6; }
            .no-print { margin-bottom: 20px; }
            .contract { max-width: 800px; margin: 0 auto; }
            h1 { text-align: center; margin-bottom: 30px; }
            h2 { margin-top: 25px; margin-bottom: 10px; }
            h3 { margin-top: 20px; margin-bottom: 8px; }
            p { margin-bottom: 12px; text-align: justify; }
            .underline { border-bottom: 1px solid black; display: inline-block; min-width: 200px; }
            .signatures { margin-top: 50px; display: flex; justify-content: space-between; }
            .signature { text-align: center; }
            .signature-line { border-bottom: 1px solid black; width: 300px; padding-top: 50px; margin-bottom: 5px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">Imprimir</button>
            <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Fechar</button>
          </div>
          ${contractRef.current.innerHTML}
        </body>
      </html>
    `);
    
    newWindow.document.close();
  };

  if (roleLoading) {
    return <div>Carregando...</div>;
  }

  if (userRole !== 'director' && userRole !== 'coordinator_floresta') {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Acesso restrito a diretores e coordenadores do Floresta</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Gerar Contrato - Floresta (R$ {contractData.valorTotal})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Novo Contrato
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Contrato de Avaliação Neuropsicológica - {client.name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Formulário de dados */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contratante">Nome do Contratante</Label>
                      <Input
                        id="contratante"
                        value={contractData.contratante}
                        onChange={(e) => handleInputChange('contratante', e.target.value)}
                        placeholder="Nome completo do responsável"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contratanteCpf">CPF do Contratante</Label>
                      <Input
                        id="contratanteCpf"
                        value={contractData.contratanteCpf}
                        onChange={(e) => handleInputChange('contratanteCpf', e.target.value)}
                        placeholder="000.000.000-00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="beneficiario">Nome do Beneficiário</Label>
                      <Input
                        id="beneficiario"
                        value={contractData.beneficiario}
                        onChange={(e) => handleInputChange('beneficiario', e.target.value)}
                        placeholder="Nome do paciente"
                      />
                    </div>
                    <div>
                      <Label htmlFor="beneficiarioCpf">CPF do Beneficiário</Label>
                      <Input
                        id="beneficiarioCpf"
                        value={contractData.beneficiarioCpf}
                        onChange={(e) => handleInputChange('beneficiarioCpf', e.target.value)}
                        placeholder="000.000.000-00"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="endereco">Endereço Completo</Label>
                    <Textarea
                      id="endereco"
                      value={contractData.endereco}
                      onChange={(e) => handleInputChange('endereco', e.target.value)}
                      placeholder="Endereço completo do beneficiário"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="valorTotal">Valor Total (R$)</Label>
                      <Input
                        id="valorTotal"
                        value={contractData.valorTotal}
                        onChange={(e) => handleInputChange('valorTotal', e.target.value)}
                        placeholder="1.600,00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="valorExtenso">Valor por Extenso</Label>
                      <Input
                        id="valorExtenso"
                        value={contractData.valorExtenso}
                        onChange={(e) => handleInputChange('valorExtenso', e.target.value)}
                        placeholder="mil e seiscentos reais"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Botões de ação */}
              <div className="flex gap-2 justify-end">
                <Button onClick={handlePreviewContract} variant="outline" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Visualizar
                </Button>
                <Button onClick={printContract} className="gap-2">
                  <Printer className="h-4 w-4" />
                  Imprimir + Registrar R$ {contractData.valorTotal}
                </Button>
              </div>

              {/* Contrato gerado */}
              <div ref={contractRef} className="contract bg-white p-8 shadow-lg border font-serif">
                <h1 className="text-center text-xl font-bold mb-6">CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE AVALIAÇÃO NEUROPSICOLÓGICA</h1>
                
                <h2 className="text-lg font-bold mb-4">1. DAS PARTES</h2>
                <p className="text-justify mb-4">
                  A pessoa jurídica FUNDAÇÃO DOM BOSCO, registrada no CNPJ sob o n∘ 17.278.904/0001-86, com endereço 
                  comercial à Rua Urucuia, 18- Bairro Floresta, Belo Horizonte - MG, denominada neste como 
                  CONTRATADA, e a pessoa física <strong>{contractData.contratante}</strong>, registrada no CPF 
                  sob o n∘ <strong>{contractData.contratanteCpf}</strong>, denominada neste como CONTRATANTE, 
                  responsável legal ou financeiro por <strong>{contractData.beneficiario}</strong>, inscrito no CPF sob o 
                  n∘ <strong>{contractData.beneficiarioCpf}</strong>, denominado neste como beneficiário do serviço, 
                  residente <strong>{contractData.endereco}</strong>, firmam contrato de prestação de serviço de avaliação neuropsicológica que será realizado conforme as 
                  cláusulas abaixo.
                </p>

                <h2 className="text-lg font-bold mb-4 mt-6">2. CLÁUSULAS</h2>

                <h2 className="text-base font-bold mb-3 mt-5">2.1. DO OBJETO E DA METODOLOGIA</h2>

                <h3 className="font-bold mb-2">2.1.1.</h3>
                <p className="text-justify mb-4">
                  A avaliação neuropsicológica é um exame complementar realizado por profissional 
                  especializado em neuropsicologia, que neste contrato é o profissional designado pela CONTRATADA, e 
                  compreende três etapas: anamnese ou entrevista inicial, aplicação dos instrumentos de avaliação 
                  neuropsicológica e entrevista devolutiva para entrega do laudo.
                </p>

                <h3 className="font-bold mb-2">2.1.2.</h3>
                <p className="text-justify mb-4">
                  Serão realizadas sessões para a coleta de dados, entrevistas, aplicações de escalas e testes e 
                  possíveis reuniões com outros informantes, sendo que ao final do processo o CONTRATANTE terá 
                  direito ao LAUDO NEUROPSICOLÓGICO, com a finalidade de atestar, aconselhar e encaminhar o 
                  paciente para o melhor tratamento adequado com suas necessidades.
                </p>

                <h3 className="font-bold mb-2">2.1.3.</h3>
                <p className="text-justify mb-4">
                  O Laudo Neuropsicológico será entregue em data a ser definida pelo profissional em acordo com o 
                  CONTRATANTE durante a Sessão de Devolutiva com duração de 1 (uma) hora, podendo ser no formato 
                  online ou presencial, a ser definido pelo neuropsicólogo.
                </p>

                <h3 className="font-bold mb-2">2.1.4.</h3>
                <p className="text-justify mb-4">
                  Os instrumentos de avaliação neuropsicológicos serão compostos de questionários, escalas, 
                  inventários, tarefas e testes neuropsicológicos aprovados e validados para aplicação na população 
                  brasileira, obedecendo aos critérios de aprovação para uso do Conselho Federal de Psicologia.
                </p>

                <h3 className="font-bold mb-2">2.1.5.</h3>
                <p className="text-justify mb-4">
                  As sessões de avaliação serão realizadas em horário combinado, estando a CONTRATADA, por meio de seu profissional, à disposição do beneficiário do serviço naquele período.
                </p>

                <h2 className="text-base font-bold mb-3 mt-5">2.2. SIGILO</h2>

                <h3 className="font-bold mb-2">2.2.1.</h3>
                <p className="text-justify mb-4">
                  O profissional designado pela CONTRATADA respeitará o sigilo profissional, a fim de proteger, por meio da 
                  confiabilidade, a intimidade das pessoas, grupos ou organizações, a que tenha acesso no exercício 
                  profissional, conforme as normativas éticas do Conselho Federal de Psicologia.
                </p>

                <h2 className="text-base font-bold mb-3 mt-5">2.3. ETAPAS DA AVALIAÇÃO NEUROPSICOLÓGICA E VIGÊNCIA DO CONTRATO</h2>

                <h3 className="font-bold mb-2">2.3.1.</h3>
                <p className="text-justify mb-4">
                  O processo de aplicação dos instrumentos ocorre com a utilização de, no mínimo 4 (quatro) sessões 
                  e no máximo 14 (catorze) sessões, com duração de 1 (uma) hora, a serem definidas pelo profissional a realizá-las, 
                  agendadas previamente com o CONTRATANTE.
                </p>

                <h3 className="font-bold mb-2">2.3.2.</h3>
                <p className="text-justify mb-4">
                  O número de sessões, bem como a duração delas, será definido pelo profissional de acordo com a complexidade do caso. Caso haja a necessidade de ultrapassar 8 (oito) sessões, A CONTRATADA deverá informar e justificar tecnicamente ao CONTRATANTE a necessidade de extensão do acompanhamento para obtenção da melhor qualidade de resultados.
                </p>

                <h3 className="font-bold mb-2">2.3.3.</h3>
                <p className="text-justify mb-4">
                  Caso o paciente a ser avaliado seja estudante e/ou esteja em acompanhamento terapêutico, será 
                  realizada entrevista com a equipe escolar e multidisciplinar como parte integrante da avaliação, 
                  conforme for possível e necessário, através de questionários e/ou vídeo conferência.
                </p>

                <h3 className="font-bold mb-2">2.3.4.</h3>
                <p className="text-justify mb-4">
                  A vigência deste contrato encerrar-se-á imediatamente após a entrega do laudo 
                  neuropsicológico e a quitação integral do valor correspondente à prestação de serviço acordada.
                </p>

                <h3 className="font-bold mb-2">2.3.5.</h3>
                <p className="text-justify mb-4">
                  As datas das sessões de avaliação serão definidas em comum acordo entre as partes e 
                  registradas neste contrato.
                </p>

                <h2 className="text-base font-bold mb-3 mt-5">2.4. CANCELAMENTO E REAGENDAMENTO DE SESSÕES</h2>

                <h3 className="font-bold mb-2">2.4.1.</h3>
                <p className="text-justify mb-4">
                  O CONTRATANTE concorda em notificar a CONTRATADA com antecedência de 12 horas em caso 
                  de cancelamento ou reagendamento de sessões.
                </p>

                <h2 className="text-base font-bold mb-3 mt-5">2.5. AVALIAÇÃO DE MENORES DE 18 ANOS</h2>

                <h3 className="font-bold mb-2">2.5.1.</h3>
                <p className="text-justify mb-4">
                  A avaliação neuropsicológica de menores de 18 anos será realizada somente com a ciência e 
                  concordância de um responsável pela criança ou adolescente.
                </p>

                <h3 className="font-bold mb-2">2.5.2.</h3>
                <p className="text-justify mb-4">
                  A criança/adolescente deverá comparecer ao consultório para avaliação acompanhado de um 
                  responsável, o qual deverá estar presente no consultório ao final de cada sessão a fim de 
                  acompanhar o menor até sua casa.
                </p>

                <h2 className="text-base font-bold mb-3 mt-5">2.6. HONORÁRIOS E FORMAS DE PAGAMENTO</h2>

                <h3 className="font-bold mb-2">2.6.1.</h3>
                <p className="text-justify mb-4">
                  A forma de pagamento deverá ser definida e devidamente registrada neste contrato durante 
                  a primeira sessão de avaliação (anamnese).
                </p>

                <h3 className="font-bold mb-2">2.6.2.</h3>
                <p className="text-justify mb-4">
                  O valor referente à prestação de serviço de Avaliação Neuropsicológica à vista ou parcelado 
                  será no total de R$ <span className="underline">{contractData.valorTotal || '______________'}</span> 
                  (<span className="underline">{contractData.valorExtenso || '______________'}</span>)
                </p>

                <p className="text-justify mb-2">
                  O pagamento dos honorários referentes ao serviço de Avaliação Neuropsicológica será efetuado:
                </p>

                <div className="ml-6 mb-4 space-y-2">
                  <p>({contractData.formaPagamento === 'vista' ? 'X' : ' '}) R$ {contractData.valorTotal || '______________'} à vista pagos na data da anamnese.</p>
                  <p>({contractData.formaPagamento === 'parcelado' ? 'X' : ' '}) R$ {contractData.valorTotal || '______________'} parcelado no Boleto{contractData.numeroParcelas ? ` - ${contractData.numeroParcelas} parcelas de R$ ${contractData.valorParcela || '___'}` : ''}{contractData.datasPagamento ? ` nas datas: ${contractData.datasPagamento}` : ''}</p>
                  <p>({contractData.cartaoCredito ? 'X' : ' '}) R$ {contractData.cartaoCredito?.valor || '______________'} no Cartão de crédito, parcelado em {contractData.cartaoCredito?.parcelas || '___'} vezes</p>
                </div>

                <h3 className="font-bold mb-2">2.6.3.</h3>
                <p className="text-justify mb-4">
                  O laudo será entregue SOMENTE após a quitação do valor total da avaliação.
                </p>

                <h3 className="font-bold mb-2">2.6.4.</h3>
                <p className="text-justify mb-4">
                  As sessões de avaliação SOMENTE terão início após o pagamento da primeira parcela.
                </p>

                <h3 className="font-bold mb-2">2.6.5.</h3>
                <p className="text-justify mb-4">
                  Os pagamentos por transferência, depósito bancário ou pix deverão ser realizados conforme 
                  os dados informados e, posteriormente, com o envio do respectivo comprovante para o e-mail: 
                  financeiro@fundacaodombosco.org com os dados referentes ao paciente e o responsável financeiro 
                  discriminados no corpo do e-mail.
                </p>

                <h3 className="font-bold mb-2">2.6.6.</h3>
                <p className="text-justify mb-4">
                  O CONTRATANTE deve, de forma imperativa, cumprir rigorosamente as datas estipuladas nas cláusulas anteriores, sob pena de rescisão contratual, nos termos constantes no item 2.7 deste contrato.
                </p>

                <h2 className="text-base font-bold mb-3 mt-5">2.7. DA RESCISÃO</h2>

                <h3 className="font-bold mb-2">2.7.1.</h3>
                <p className="text-justify mb-4">
                  O presente instrumento poderá ser rescindido caso qualquer das partes descumpra o disposto 
                  neste contrato.
                </p>

                <h3 className="font-bold mb-2">2.7.2.</h3>
                <p className="text-justify mb-4">
                  Na hipótese de o CONTRATANTE solicitar a rescisão antecipada deste contrato sem justa 
                  causa, será obrigado a pagar à CONTRATADA por inteiro qualquer retribuição vencida e não paga, 
                  acrescida de multa compensatória de 20% (vinte por cento) sobre o valor remanescente do contrato (saldo devedor).
                </p>

                <h3 className="font-bold mb-2">2.7.3.</h3>
                <p className="text-justify mb-4">
                  Na hipótese de a CONTRATADA solicitar a rescisão antecipada deste contrato sem justa 
                  causa, terá direito à retribuição vencida.
                </p>

                <h3 className="font-bold mb-2">2.7.4.</h3>
                <p className="text-justify mb-4">
                  Caso o CONTRATANTE não compareça a 4 (quatro) sessões seguidas sem informar e justificar (diante de atestado médico no caso de doença) a CONTRATADA, e não houver possibilidade de contato após esse período, a CONTRATADA notificará o abandono. O contrato fica rescindido automaticamente, e o CONTRATANTE fica obrigado a pagar o valor referente às 4 (quatro) sessões perdidas mais uma multa administrativa de 15% (quinze por cento) sobre o valor total do contrato.
                </p>

                <h3 className="font-bold mb-2">2.7.5.</h3>
                <p className="text-justify mb-4">
                  O presente contrato poderá ser rescindido imediatamente pela CONTRATADA por justa causa, mediante notificação formal, nas seguintes hipóteses, sem que isso implique o pagamento de multa rescisória à parte contrária:
                </p>
                
                <div className="ml-6 mb-4 space-y-2">
                  <p className="text-justify">1. <strong>Inadimplemento Financeiro:</strong> Atraso no pagamento de quaisquer parcelas nos prazos estipulados na Cláusula 2.6 que ultrapasse 30 (trinta) dias após o vencimento, após o CONTRATANTE ter sido formalmente notificado do débito.</p>
                  <p className="text-justify">2. <strong>Comportamento Inadequado:</strong> Conduta agressiva, violenta, ameaçadora, ou qualquer forma de desrespeito ou assédio dirigida ao profissional neuropsicólogo, à equipe da CONTRATADA ou a outros pacientes/responsáveis nas dependências da clínica ou em ambiente virtual.</p>
                  <p className="text-justify">3. <strong>Violação de Sigilo e Privacidade:</strong> Tentativa ou efetiva gravação, filmagem ou coleta não autorizada de áudio e/ou vídeo das sessões ou do ambiente da clínica, sem consentimento prévio e expresso da CONTRATADA.</p>
                  <p className="text-justify">4. <strong>Omissão ou Falsidade de Informações:</strong> Comprovação de que o CONTRATANTE forneceu informações falsas, incompletas ou omitiu dados clínicos e/ou processuais que sejam cruciais para a correta realização e o direcionamento da Avaliação Neuropsicológica.</p>
                  <p className="text-justify">5. <strong>Desrespeito Ético/Legal:</strong> Qualquer ato do CONTRATANTE que obrigue o profissional neuropsicólogo a violar o Código de Ética Profissional ou as normas do Conselho Federal de Psicologia.</p>
                </div>

                <h3 className="font-bold mb-2">2.7.6</h3>
                <p className="text-justify mb-4">
                  Na ocorrência de Justa Causa imputável ao CONTRATANTE, este deverá efetuar o pagamento integral de todas as sessões e parcelas vencidas e, adicionalmente, estará sujeito à Multa Contratual Compensatória de 20% (vinte por cento) sobre o valor total do contrato, como indenização mínima.
                </p>

                <h3 className="font-bold mb-2">2.7.7</h3>
                <p className="text-justify mb-4">
                  Com a assinatura, ambas as partes atestam que tiveram oportunidade de ler, discutir, definir 
                  e concordar com todas as cláusulas deste contrato.
                </p>

                <p className="text-center mt-8 mb-8">
                  Belo Horizonte, [ ______________ ] de [ ______________ ] de [ ______________ ]
                </p>

                <div className="signatures">
                  <div className="signature">
                    <div className="signature-line"></div>
                    <p>Contratada</p>
                  </div>
                  <div className="signature">
                    <div className="signature-line"></div>
                    <p>Contratante</p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};