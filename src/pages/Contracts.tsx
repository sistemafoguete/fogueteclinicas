import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useCustomPermissions } from '@/hooks/useCustomPermissions';
import { FileText, Edit, Plus, Users, Search, Calendar, UserPlus, Shield, Printer, X, AlertTriangle, Settings, Download } from 'lucide-react';
import timbradoFooter from '@/assets/contract-timbrado-footer.jpg';
import logoFundacao from '@/assets/fundacao-dom-bosco-logo-main.png';
import { useNavigate, Link } from 'react-router-dom';
import { downloadContractDocx, ContractDocxData } from '@/utils/contractDocx';
interface Client {
  id: string;
  name: string;
  cpf?: string;
  address?: string;
  responsible_name?: string;
  responsible_cpf?: string;
  responsible_phone?: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  unit?: string;
}
interface PaymentMethod {
  method: string;
  amount: number;
  notes?: string;
}
interface ContractData {
  contractType: string;
  clientId: string;
  clientName: string;
  clientCpf: string;
  responsibleName: string;
  responsibleCpf: string;
  address: string;
  paymentMethod: string;
  value: string;
  valueInWords: string;
  contractDate: string;
  creditCardInstallments: number;
  downPaymentAmount: string;
  downPaymentMethod: string;
  isManualCombination: boolean;
  paymentNotes: string;
  paymentCombination: PaymentMethod[];
  useCombinedPayment: boolean;
  includeResponsible: boolean;
}
interface ContractTemplate {
  id: string;
  name: string;
  content: string;
  is_default: boolean;
}
export default function Contracts() {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const {
    userRole,
    loading: roleLoading
  } = useRolePermissions();
  const customPermissions = useCustomPermissions();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [contractTemplate, setContractTemplate] = useState<ContractTemplate | null>(null);
  const [contractData, setContractData] = useState<ContractData>({
    contractType: 'Avaliação Neuropsicológica',
    clientId: '',
    clientName: '',
    clientCpf: '',
    responsibleName: '',
    responsibleCpf: '',
    address: '',
    paymentMethod: 'PIX',
    value: '',
    valueInWords: '',
    contractDate: new Date().toISOString().split('T')[0],
    creditCardInstallments: 1,
    downPaymentAmount: '',
    downPaymentMethod: 'Dinheiro',
    isManualCombination: false,
    paymentNotes: '',
    paymentCombination: [],
    useCombinedPayment: false,
    includeResponsible: false
  });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([{
    method: 'cash',
    amount: 0,
    notes: ''
  }]);
  const addPaymentMethod = () => {
    setPaymentMethods([...paymentMethods, {
      method: 'cash',
      amount: 0,
      notes: ''
    }]);
  };
  const removePaymentMethod = (index: number) => {
    setPaymentMethods(paymentMethods.filter((_, i) => i !== index));
  };
  const updatePaymentMethod = (index: number, field: keyof PaymentMethod, value: any) => {
    const updated = [...paymentMethods];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setPaymentMethods(updated);
  };
  const getTotalFromCombinedPayments = () => {
    return paymentMethods.reduce((sum, pm) => sum + (parseFloat(String(pm.amount)) || 0), 0);
  };
  const translatePaymentMethodCode = (code: string): string => {
    const translations: Record<string, string> = {
      'cash': 'Dinheiro',
      'credit_card': 'Cartão de Crédito',
      'debit_card': 'Cartão de Débito',
      'pix': 'PIX',
      'bank_transfer': 'Transferência',
      'bank_slip': 'Boleto',
      'credit': 'Crédito (Fiado)',
      'check': 'Cheque'
    };
    return translations[code] || code;
  };
  useEffect(() => {
    if (roleLoading || customPermissions.loading) {
      console.log('⏳ Aguardando carregamento de permissões...', {
        roleLoading,
        customLoading: customPermissions.loading
      });
      return;
    }

    // Verificar permissão: diretor, coordenador floresta OU permissão customizada
    const hasAccess = userRole === 'director' || userRole === 'coordinator_floresta' || customPermissions.hasPermission('view_contracts');
    console.log('🔐 Verificação de acesso - Contracts:', {
      userRole,
      hasCustomPermission: customPermissions.hasPermission('view_contracts'),
      hasAccess
    });
    if (!hasAccess) {
      toast({
        variant: "destructive",
        title: "Acesso Restrito",
        description: "Apenas diretores e coordenadores do Floresta podem gerar contratos."
      });
      return;
    }
    loadClients();
    loadDefaultTemplate();
  }, [roleLoading, userRole, customPermissions.loading, customPermissions.hasPermission('view_contracts')]);
  const loadDefaultTemplate = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('contract_templates').select('*').eq('is_default', true).eq('is_active', true).single();
      if (error && error.code !== 'PGRST116') {
        console.error('Error loading template:', error);
      }
      if (data) {
        setContractTemplate(data);
      }
    } catch (error) {
      console.error('Error loading default template:', error);
    }
  };
  const loadClients = async () => {
    setLoading(true);
    try {
      let query = supabase.from('clients').select('*').eq('is_active', true);

      // Se não for diretor, filtra apenas pela unidade floresta
      if (userRole !== 'director') {
        query = query.eq('unit', 'floresta');
      }
      const {
        data,
        error
      } = await query.order('name');
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os pacientes."
      });
    } finally {
      setLoading(false);
    }
  };
  const handleClientSelect = (clientId: string) => {
    const selectedClient = clients.find(c => c.id === clientId);
    if (selectedClient) {
      // Detecta se tem responsável financeiro diferente do paciente
      const hasResponsible = !!selectedClient.responsible_cpf && selectedClient.responsible_cpf !== selectedClient.cpf;
      setContractData(prev => ({
        ...prev,
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        clientCpf: selectedClient.cpf || '',
        responsibleName: hasResponsible ? selectedClient.responsible_name || '' : '',
        responsibleCpf: hasResponsible ? selectedClient.responsible_cpf : '',
        address: selectedClient.address || '',
        includeResponsible: hasResponsible
      }));
    }
  };
  const generatePaymentDetails = (): string => {
    const valorNum = parseContractValue(contractData.value);
    switch (contractData.paymentMethod) {
      case 'PIX':
        return `(X) R$ ${contractData.value} à vista via PIX na data da anamnese.`;
      case 'Cartão':
        const valorParcela = (valorNum / contractData.creditCardInstallments).toFixed(2).replace('.', ',');
        return `(X) R$ ${contractData.value} no Cartão de crédito, parcelado em ${contractData.creditCardInstallments}x de R$ ${valorParcela}`;
      case 'Boleto':
        return `(X) R$ ${contractData.value} parcelado no Boleto conforme acordado.`;
      case 'Transferência':
        return `(X) R$ ${contractData.value} via Transferência Bancária.`;
      case 'Combinado':
        if (contractData.useCombinedPayment && contractData.paymentCombination.length > 0) {
          let detalhes = `(X) Pagamento Combinado:\n`;
          contractData.paymentCombination.forEach((pm, index) => {
            detalhes += `    ${index + 1}. R$ ${pm.amount.toFixed(2).replace('.', ',')} via ${translatePaymentMethodCode(pm.method)}`;
            if (pm.notes) {
              detalhes += ` (${pm.notes})`;
            }
            detalhes += '\n';
          });
          detalhes += `    TOTAL: R$ ${contractData.value}`;
          return detalhes;
        }
        return `(X) Pagamento conforme acordado`;
      case 'Manual':
        let detalhes = '';
        if (contractData.downPaymentAmount) {
          const entrada = contractData.downPaymentAmount;
          const restante = (valorNum - parseFloat(contractData.downPaymentAmount.replace(',', '.') || '0')).toFixed(2).replace('.', ',');
          detalhes = `(X) Pagamento Manual:\n`;
          detalhes += `    • Entrada: R$ ${entrada} (${contractData.downPaymentMethod}) na data da anamnese\n`;
          detalhes += `    • Saldo restante: R$ ${restante}\n`;
          if (contractData.paymentNotes) {
            detalhes += `    • Observações: ${contractData.paymentNotes}`;
          }
        } else {
          detalhes = `(X) Pagamento Manual conforme combinado: ${contractData.paymentNotes || 'A definir'}`;
        }
        return detalhes;
      default:
        return `( ) R$ ______________ à vista pagos na data da anamnese.\n( ) R$ ______________ parcelado no Boleto\n( ) R$ ______________ no Cartão de crédito`;
    }
  };
  const generateContract = () => {
    // Define o texto das partes com base em incluir ou não o responsável
    const partiesText = contractData.includeResponsible ? `A pessoa jurídica Fundação Dom Bosco, registrada no CNPJ sob o nº 17.278.904/0001-86, com endereço comercial à Rua Urucuia, 18 – Bairro Floresta, Belo Horizonte – MG, denominada neste como CONTRATADA e a pessoa física ${contractData.responsibleName || '______________________________________________'}, registrada no CPF sob o nº ${contractData.responsibleCpf || '__________________________________'}, denominada neste como CONTRATANTE, responsável legal ou financeiro por ${contractData.clientName || '__________________________________________'}, inscrito no CPF sob o nº ${contractData.clientCpf || '__________________________________________'}, denominado neste como beneficiário do serviço, residente à ${contractData.address || '____________________________________________________________'} firmam contrato de prestação de serviço de avaliação neuropsicológica que será realizado conforme as cláusulas abaixo.` : `A pessoa jurídica Fundação Dom Bosco, registrada no CNPJ sob o nº 17.278.904/0001-86, com endereço comercial à Rua Urucuia, 18 – Bairro Floresta, Belo Horizonte – MG, denominada neste como CONTRATADA e a pessoa física ${contractData.clientName || '______________________________________________'}, registrada no CPF sob o nº ${contractData.clientCpf || '__________________________________'}, denominada neste como CONTRATANTE e beneficiário do serviço, residente à ${contractData.address || '____________________________________________________________'} firmam contrato de prestação de serviço de avaliação neuropsicológica que será realizado conforme as cláusulas abaixo.`;

    // Se tem template do banco de dados, usar ele com substituições
    if (contractTemplate?.content) {
      const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      const date = new Date();
      let content = contractTemplate.content;

      // Substituir todas as variáveis
      const replacements: Record<string, string> = {
        '{{TEXTO_PARTES}}': partiesText,
        '{{NOME_CONTRATANTE}}': contractData.responsibleName || contractData.clientName || '______________',
        '{{CPF_CONTRATANTE}}': contractData.responsibleCpf || contractData.clientCpf || '______________',
        '{{NOME_BENEFICIARIO}}': contractData.clientName || '______________',
        '{{CPF_BENEFICIARIO}}': contractData.clientCpf || '______________',
        '{{ENDERECO}}': contractData.address || '______________',
        '{{VALOR}}': contractData.value || '______________________',
        '{{VALOR_EXTENSO}}': contractData.valueInWords || '______________________________________________',
        '{{FORMA_PAGAMENTO}}': generatePaymentDetails(),
        '{{DATA_DIA}}': String(date.getDate()),
        '{{DATA_MES}}': months[date.getMonth()],
        '{{DATA_ANO}}': String(date.getFullYear())
      };
      Object.entries(replacements).forEach(([key, value]) => {
        content = content.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
      });
      return content;
    }

    // Fallback: usar template hardcoded se não houver no banco
    const contractContent = `
Contrato de Prestação de Serviços
Avaliação Neuropsicológica

1. Das partes

${partiesText}

2. Cláusulas

2.1.1. A avaliação neuropsicológica é um exame complementar realizado por profissional especializado em neuropsicologia e que neste contrato é denominada como CONTRATADA, e compreende três etapas, sendo: anamnese ou entrevista inicial, aplicação dos instrumentos de avaliação neuropsicológica e entrevista devolutiva para entrega do laudo.

2.1.2. Serão realizadas sessões para a coleta de dados, entrevistas, aplicações de escalas e testes e possíveis reuniões com outros informantes, sendo que ao final do processo o CONTRATANTE terá direito ao LAUDO NEUROPSICOLÓGICO, com a finalidade de atestar, aconselhar e encaminhar o paciente para o melhor tratamento adequado com suas necessidades.

2.1.3. O Laudo Neuropsicológico será entregue em data a ser definida pelo profissional em acordo com o contratante durante a Sessão de Devolutiva com duração de 1 (uma) hora, podendo ser no formato online ou presencial, a ser definido pelo neuropsicólogo.

2.1.4. Os instrumentos de avaliação neuropsicológicos serão compostos de questionários, escalas, inventários, tarefas e testes neuropsicológicos aprovados e validados para aplicação na população brasileira obedecendo aos critérios de aprovação para uso do Conselho Federal de Psicologia.

2.1.5. As sessões de avaliação serão realizadas em horário combinado, estando a neuropsicóloga à disposição do beneficiário do serviço naquele período.

2.2. Sigilo

2.2.1. A neuropsicóloga respeitará o sigilo profissional a fim de proteger, por meio da confiabilidade, a intimidade das pessoas, grupos ou organizações, a que tenha acesso no exercício profissional (Código de Ética do Psicólogo, artigo 9º).

2.3. Etapas da Avaliação Neuropsicológica e Vigência do Contrato

2.3.1. O processo de aplicação dos instrumentos ocorre com a utilização de, no mínimo 4 sessões e no máximo 14 sessões, com duração 1 (uma) hora, a serem definidas pelo profissional a realizá-las, agendadas previamente com o contratante.

2.3.2. O número de sessões, bem como a duração delas, será definido pela neuropsicóloga, de acordo com a direcionamento e conhecimento da profissional, de maneira a obter-se sempre a melhor qualidade de resultados.

2.3.3. Caso o paciente a ser avaliado ser estudante e/ou estar em acompanhamento terapêutico será realizada entrevista com a equipe escolar e multidisciplinar como parte integrante da avaliação, conforme for possível e necessário, através de questionários e/ou vídeo conferência.

2.3.4. A vigência deste contrato encerrar-se-á imediatamente após a entrega do laudo neuropsicológico e à quitação do valor correspondente à prestação de serviço acordada.

2.3.5. As datas das sessões de avaliação serão definidas em comum acordo entre as partes e registradas neste contrato.

2.4. Cancelamento e reagendamento de sessões

2.4.1. O Contratante concorda em notificar o Contratado com antecedência de 12 horas em caso de cancelamento ou reagendamento de sessões.

2.5. Avaliação de menores de 18 anos

2.5.1. A avaliação neuropsicológica de menores de 18 anos será realizada somente com a ciência e concordância de um responsável pela criança ou adolescente.

2.5.2. A criança/adolescente deverá comparecer ao consultório para avaliação acompanhado de um responsável, o qual deverá estar presente no consultório ao final de cada sessão a fim de acompanhar o menor até sua casa.

2.6. Honorários e formas de pagamento

2.6.1. A forma de pagamento deverá ser definida e devidamente registrada neste contrato durante a primeira sessão de avaliação (anamnese).

2.6.2. O valor referente à prestação de serviço de Avaliação Neuropsicológica à vista ou parcelado será no total de R$ ${contractData.value || '______________________'} (${contractData.valueInWords || '______________________________________________'})

O pagamento dos honorários referentes ao serviço de Avaliação Neuropsicológica será efetuado:

${generatePaymentDetails()}

2.6.3. O laudo será entregue SOMENTE após a quitação do valor total da avaliação.

2.6.4. As sessões de avaliação SOMENTE terão início após o pagamento da primeira parcela.

2.6.5. Os pagamentos por transferência, deposito bancário ou pix deverão ser realizados conforme os dados informados e posteriormente com o envio do respectivo comprovante para o e-mail: financeiro@fundacaodombosco.org com os dados referentes ao paciente e o responsável financeiro descriminados no corpo do e-mail.

2.6.6. Caso o contratante opte pelo parcelamento do pagamento em 2 (duas) ou mais parcelas, fica vedada a condição de vincular o pagamento do serviço à entrega do Laudo Neuropsicológico. O contratante deve, de forma imperativa, cumprir rigorosamente as datas estipuladas nas cláusulas anteriores, sob pena de rescisão contratual, nos termos contantes no item 2.7 deste contrato.

2.7. Da Rescisão

2.7.1. O presente instrumento poderá ser rescindido caso qualquer das partes descumpra o disposto neste contrato.

2.7.2. Na hipótese de a CONTRANTE solicitar a rescisão antecipada deste contrato sem justa causa, será obrigada a pagar a CONTRATADA por inteiro qualquer retribuição vencida e não paga e 50% (cinquenta por cento) do que ela receberia até o final do contrato.

2.7.3. Na hipótese de a CONTRATADA solicitar a rescisão antecipada deste contrato sem justa causa terá direito a retribuição vencida.

2.7.4. Caso a CONTRATANTE não compareça a 4 sessões seguidas sem informar a CONTRATADA e não houver possibilidade de contato após esse período, este contrato fica rescindido automaticamente e fica obrigada a pagar 100% do valor do contrato.

2.7.5. Com a assinatura, ambas as partes atestam que tiveram oportunidade de ler, discutir, definir e concordar com todas as cláusulas deste contrato.


Belo Horizonte, ________ de _______________ de ______________.

__________________________________________________
Contratada

___________________________________________________
Contratante
`;
    return contractContent;
  };
  const parseContractValue = (value: string): number => {
    // Converte valores como "1.600,00" para 1600.00
    if (!value || value.trim() === '') return 0;
    const cleaned = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };
  const createFinancialRecord = async () => {
    const contractValueNumber = parseContractValue(contractData.value);
    console.log('📊 Criando registro financeiro:', {
      amount: contractValueNumber,
      clientName: contractData.clientName,
      clientId: contractData.clientId
    });
    const recordData: any = {
      type: 'income',
      category: 'evaluation',
      description: `Avaliação Neuropsicológica - ${contractData.clientName}`,
      amount: contractValueNumber,
      date: contractData.contractDate,
      client_id: contractData.clientId,
      created_by: user?.id,
      notes: `Contrato gerado - Pagamento registrado`
    };

    // Se for pagamento combinado
    if (contractData.useCombinedPayment && contractData.paymentCombination.length > 0) {
      recordData.payment_method = 'combined';
      recordData.payment_combination = contractData.paymentCombination;
    } else {
      recordData.payment_method = 'contract';
    }
    const {
      error
    } = await supabase.from('financial_records').insert([recordData]);
    if (error) {
      console.error('❌ Erro ao criar registro financeiro:', error);
      throw error;
    }
    console.log('✅ Registro financeiro criado com sucesso');
  };

  // Função para baixar o contrato em Word (.docx)
  const handleDownloadWord = async () => {
    setIsGenerating(true);
    try {
      // Validações
      if (!contractData.value || !contractData.valueInWords) {
        toast({
          variant: "destructive",
          title: "Campos obrigatórios",
          description: "Por favor, preencha o valor do contrato e o valor por extenso."
        });
        setIsGenerating(false);
        return;
      }
      if (!contractData.clientId) {
        toast({
          variant: "destructive",
          title: "Cliente não selecionado",
          description: "Por favor, selecione um cliente antes de gerar o contrato."
        });
        setIsGenerating(false);
        return;
      }

      // Buscar dados do usuário atual
      const {
        data: currentUser,
        error: userError
      } = await supabase.from('profiles').select('name').eq('user_id', user?.id).single();
      if (userError) {
        console.error('Erro ao buscar usuário:', userError);
      }
      const userName = currentUser?.name || 'Usuário não identificado';
      const contractValueNumber = parseContractValue(contractData.value);

      // Validação pagamento combinado
      if (contractData.paymentMethod === 'Combinado' && contractData.useCombinedPayment) {
        const combinedTotal = getTotalFromCombinedPayments();
        const contractValue = parseContractValue(contractData.value);
        if (Math.abs(combinedTotal - contractValue) > 0.01) {
          toast({
            variant: "destructive",
            title: "Erro de Validação",
            description: `O total dos métodos de pagamento (R$ ${combinedTotal.toFixed(2).replace('.', ',')}) não corresponde ao valor do contrato (R$ ${contractValue.toFixed(2).replace('.', ',')}).`
          });
          setIsGenerating(false);
          return;
        }
        setContractData(prev => ({
          ...prev,
          paymentCombination: paymentMethods.filter(pm => pm.amount > 0)
        }));
      }

      // Criar registros no banco (attendance_reports, client_payments, etc.)
      const {
        data: attendanceReport,
        error: attendanceError
      } = await supabase.from('attendance_reports').insert([{
        client_id: contractData.clientId,
        employee_id: user?.id,
        patient_name: contractData.clientName,
        professional_name: userName,
        attendance_type: 'Avaliação Neuropsicológica',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        session_duration: 60,
        amount_charged: contractValueNumber,
        professional_amount: 0,
        institution_amount: contractValueNumber,
        status: 'completed',
        validation_status: 'validated',
        session_notes: `Contrato de Avaliação Neuropsicológica gerado por ${userName}`,
        created_by: user?.id,
        completed_by: user?.id,
        completed_by_name: userName,
        validated_by: user?.id,
        validated_by_name: userName,
        validated_at: new Date().toISOString()
      }]).select().single();
      if (attendanceError) {
        console.error('Erro ao criar relatório de atendimento:', attendanceError);
      }
      const downPaymentNum = contractData.downPaymentAmount ? parseFloat(contractData.downPaymentAmount.replace(',', '.')) : 0;
      const {
        error: paymentError
      } = await supabase.from('client_payments').insert([{
        client_id: contractData.clientId,
        payment_type: 'Avaliação Neuropsicológica',
        total_amount: contractValueNumber,
        amount_paid: contractData.paymentMethod === 'Manual' ? downPaymentNum : contractValueNumber,
        amount_remaining: contractData.paymentMethod === 'Manual' ? contractValueNumber - downPaymentNum : 0,
        status: contractData.paymentMethod === 'Manual' && downPaymentNum < contractValueNumber ? 'partial' : 'completed',
        payment_method: contractData.paymentMethod,
        description: `Pagamento de Avaliação Neuropsicológica - Contrato gerado por ${userName}`,
        unit: 'floresta',
        created_by: user?.id,
        installments_total: contractData.paymentMethod === 'Cartão' ? contractData.creditCardInstallments : 1,
        installments_paid: contractData.paymentMethod === 'Manual' && downPaymentNum > 0 ? 1 : contractData.paymentMethod === 'Cartão' ? 0 : 1,
        credit_card_installments: contractData.paymentMethod === 'Cartão' ? contractData.creditCardInstallments : null,
        down_payment_amount: contractData.paymentMethod === 'Manual' ? downPaymentNum : null,
        down_payment_method: contractData.paymentMethod === 'Manual' ? contractData.downPaymentMethod : null,
        notes: contractData.paymentNotes || `Forma de pagamento: ${contractData.paymentMethod}`
      }]);
      if (paymentError) {
        console.error('Erro ao criar registro de pagamento:', paymentError);
      }
      const {
        error: autoFinancialError
      } = await supabase.from('automatic_financial_records').insert([{
        patient_id: contractData.clientId,
        patient_name: contractData.clientName,
        professional_id: user?.id,
        professional_name: userName,
        amount: contractValueNumber,
        transaction_type: 'income',
        payment_method: 'Contrato',
        description: `Avaliação Neuropsicológica - Contrato gerado por ${userName}`,
        origin_type: 'contract',
        origin_id: attendanceReport?.id,
        attendance_report_id: attendanceReport?.id,
        created_by: user?.id,
        created_by_name: userName,
        metadata: {
          contract_data: JSON.parse(JSON.stringify(contractData)),
          generated_by: userName,
          generated_at: new Date().toISOString(),
          contract_type: 'Avaliação Neuropsicológica'
        } as any
      }]);
      if (autoFinancialError) {
        console.error('Erro ao criar registro financeiro automático:', autoFinancialError);
      }
      try {
        await createFinancialRecord();
      } catch (error) {
        console.error('❌ Falha ao criar registro financeiro:', error);
      }

      // Gerar texto das partes
      const partiesText = contractData.includeResponsible ? `A pessoa jurídica Fundação Dom Bosco, registrada no CNPJ sob o nº 17.278.904/0001-86, com endereço comercial à Rua Urucuia, 18 – Bairro Floresta, Belo Horizonte – MG, denominada neste como CONTRATADA e a pessoa física ${contractData.responsibleName || '______________________________________________'}, registrada no CPF sob o nº ${contractData.responsibleCpf || '__________________________________'}, denominada neste como CONTRATANTE, responsável legal ou financeiro por ${contractData.clientName || '__________________________________________'}, inscrito no CPF sob o nº ${contractData.clientCpf || '__________________________________________'}, denominado neste como beneficiário do serviço, residente à ${contractData.address || '____________________________________________________________'} firmam contrato de prestação de serviço de avaliação neuropsicológica que será realizado conforme as cláusulas abaixo.` : `A pessoa jurídica Fundação Dom Bosco, registrada no CNPJ sob o nº 17.278.904/0001-86, com endereço comercial à Rua Urucuia, 18 – Bairro Floresta, Belo Horizonte – MG, denominada neste como CONTRATADA e a pessoa física ${contractData.clientName || '______________________________________________'}, registrada no CPF sob o nº ${contractData.clientCpf || '__________________________________'}, denominada neste como CONTRATANTE e beneficiário do serviço, residente à ${contractData.address || '____________________________________________________________'} firmam contrato de prestação de serviço de avaliação neuropsicológica que será realizado conforme as cláusulas abaixo.`;
      const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      const date = new Date();

      // Dados para o template DOCX
      const docxData: ContractDocxData = {
        textoPartes: partiesText,
        valor: contractData.value || '______________________',
        valorExtenso: contractData.valueInWords || '______________________________________________',
        formaPagamento: generatePaymentDetails(),
        dataDia: String(date.getDate()),
        dataMes: months[date.getMonth()],
        dataAno: String(date.getFullYear())
      };

      // Baixar o documento Word
      await downloadContractDocx(docxData, contractData.clientName);
      toast({
        title: "Contrato gerado com sucesso!",
        description: `Documento Word baixado. Para PDF idêntico, abra no Word e salve como PDF.`
      });
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Erro ao gerar contrato:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao gerar o contrato. Verifique se o template está disponível."
      });
    } finally {
      setIsGenerating(false);
    }
  };
  const handlePrintContract = async () => {
    setIsGenerating(true);
    try {
      // ✅ VALIDAÇÕES OBRIGATÓRIAS
      if (!contractData.value || !contractData.valueInWords) {
        toast({
          variant: "destructive",
          title: "Campos obrigatórios",
          description: "Por favor, preencha o valor do contrato e o valor por extenso."
        });
        setIsGenerating(false);
        return;
      }
      if (!contractData.clientId) {
        toast({
          variant: "destructive",
          title: "Cliente não selecionado",
          description: "Por favor, selecione um cliente antes de gerar o contrato."
        });
        setIsGenerating(false);
        return;
      }

      // Buscar dados do usuário atual para registrar quem imprimiu
      const {
        data: currentUser,
        error: userError
      } = await supabase.from('profiles').select('name').eq('user_id', user?.id).single();
      if (userError) {
        console.error('Erro ao buscar usuário:', userError);
      }
      const userName = currentUser?.name || 'Usuário não identificado';
      const contractValueNumber = parseContractValue(contractData.value);

      // ✅ VALIDAÇÃO PAGAMENTO COMBINADO
      if (contractData.paymentMethod === 'Combinado' && contractData.useCombinedPayment) {
        const combinedTotal = getTotalFromCombinedPayments();
        const contractValue = parseContractValue(contractData.value);
        console.log('🔍 Validação de pagamento combinado:', {
          combinedTotal,
          contractValue,
          difference: Math.abs(combinedTotal - contractValue),
          paymentMethods
        });

        // Tolerância de 0.01 para lidar com arredondamentos
        if (Math.abs(combinedTotal - contractValue) > 0.01) {
          toast({
            variant: "destructive",
            title: "Erro de Validação",
            description: `O total dos métodos de pagamento (R$ ${combinedTotal.toFixed(2).replace('.', ',')}) não corresponde ao valor do contrato (R$ ${contractValue.toFixed(2).replace('.', ',')}).`
          });
          setIsGenerating(false);
          return;
        }

        // Atualizar contractData com a combinação
        setContractData(prev => ({
          ...prev,
          paymentCombination: paymentMethods.filter(pm => pm.amount > 0)
        }));
      }

      // Criar registro no attendance_reports
      const {
        data: attendanceReport,
        error: attendanceError
      } = await supabase.from('attendance_reports').insert([{
        client_id: contractData.clientId,
        employee_id: user?.id,
        patient_name: contractData.clientName,
        professional_name: userName,
        attendance_type: 'Avaliação Neuropsicológica',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        // 1 hora depois
        session_duration: 60,
        amount_charged: contractValueNumber,
        professional_amount: 0,
        // Pode ser definido depois
        institution_amount: contractValueNumber,
        status: 'completed',
        validation_status: 'validated',
        session_notes: `Contrato de Avaliação Neuropsicológica gerado e impresso por ${userName}`,
        created_by: user?.id,
        completed_by: user?.id,
        completed_by_name: userName,
        validated_by: user?.id,
        validated_by_name: userName,
        validated_at: new Date().toISOString()
      }]).select().single();
      if (attendanceError) {
        console.error('Erro ao criar relatório de atendimento:', attendanceError);
      }

      // Criar registro de pagamento do paciente
      const downPaymentNum = contractData.downPaymentAmount ? parseFloat(contractData.downPaymentAmount.replace(',', '.')) : 0;
      const {
        error: paymentError
      } = await supabase.from('client_payments').insert([{
        client_id: contractData.clientId,
        payment_type: 'Avaliação Neuropsicológica',
        total_amount: contractValueNumber,
        amount_paid: contractData.paymentMethod === 'Manual' ? downPaymentNum : contractValueNumber,
        amount_remaining: contractData.paymentMethod === 'Manual' ? contractValueNumber - downPaymentNum : 0,
        status: contractData.paymentMethod === 'Manual' && downPaymentNum < contractValueNumber ? 'partial' : 'completed',
        payment_method: contractData.paymentMethod,
        description: `Pagamento de Avaliação Neuropsicológica - Contrato impresso por ${userName}`,
        unit: 'floresta',
        created_by: user?.id,
        installments_total: contractData.paymentMethod === 'Cartão' ? contractData.creditCardInstallments : 1,
        installments_paid: contractData.paymentMethod === 'Manual' && downPaymentNum > 0 ? 1 : contractData.paymentMethod === 'Cartão' ? 0 : 1,
        credit_card_installments: contractData.paymentMethod === 'Cartão' ? contractData.creditCardInstallments : null,
        down_payment_amount: contractData.paymentMethod === 'Manual' ? downPaymentNum : null,
        down_payment_method: contractData.paymentMethod === 'Manual' ? contractData.downPaymentMethod : null,
        notes: contractData.paymentNotes || `Forma de pagamento: ${contractData.paymentMethod}`
      }]);
      if (paymentError) {
        console.error('Erro ao criar registro de pagamento:', paymentError);
      }

      // Criar registro financeiro automático
      const {
        error: autoFinancialError
      } = await supabase.from('automatic_financial_records').insert([{
        patient_id: contractData.clientId,
        patient_name: contractData.clientName,
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
        metadata: {
          contract_data: JSON.parse(JSON.stringify(contractData)),
          printed_by: userName,
          printed_at: new Date().toISOString(),
          contract_type: 'Avaliação Neuropsicológica'
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
          description: "Contrato gerado mas houve erro ao criar registro financeiro. Verifique o financeiro."
        });
      }

      // Gerar contrato para impressão
      const contractContent = generateContract();

      // Converter imagens para Base64 para garantir que funcionem na impressão
      const imageToBase64 = (imgSrc: string): Promise<string> => {
        return new Promise(resolve => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          };
          img.onerror = () => resolve(imgSrc);
          img.src = imgSrc;
        });
      };
      const [logoBase64, footerBase64] = await Promise.all([imageToBase64(logoFundacao), imageToBase64(timbradoFooter)]);
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Contrato - ${contractData.clientName}</title>
              <meta charset="UTF-8">
              <style>
                @page {
                  size: A4;
                  /* Margens do conteúdo (o rodapé fica reservado via padding-bottom) */
                  margin: 15mm 15mm 50mm 15mm;
                }

                * {
                  box-sizing: border-box;
                  margin: 0;
                  padding: 0;
                }

                html, body {
                  margin: 0;
                  padding: 0;
                  font-family: Arial, sans-serif;
                  font-size: 12px;
                  line-height: 1.5;
                  background: #fff;
                  color: #000;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }

                .contract-content {
                  white-space: pre-line;
                  font-size: 12px;
                  text-align: justify;
                  /* Deixa as margens por conta do @page */
                  padding: 0;
                }

                .print-info {
                  text-align: right;
                  font-size: 8px;
                  color: #666;
                  margin-bottom: 10px;
                }

                /* Cabeçalho centralizado com título */
                .contract-header {
                  text-align: center;
                  /* Deixa as margens por conta do @page */
                  padding: 0;
                  page-break-after: avoid;
                }

                .contract-header img {
                  max-height: 75px;
                  width: auto;
                  margin-bottom: 12px;
                }

                .contract-header h1 {
                  font-size: 16px;
                  font-weight: bold;
                  margin: 8px 0 5px 0;
                  text-align: center;
                }

                .contract-header h2 {
                  font-size: 14px;
                  font-weight: normal;
                  margin: 0 0 6px 0;
                  text-align: center;
                }

                .contract-header .client-name {
                  font-size: 13px;
                  font-weight: bold;
                  margin: 8px 0 14px 0;
                  text-align: center;
                }

                /* Rodapé fixo no final absoluto de cada página */
                .page-footer {
                  position: fixed;
                  bottom: 0;
                  left: 0;
                  right: 0;
                  width: 100%;
                  height: 45mm; /* altura suficiente para não cortar a matriz */
                  z-index: 1000;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }

                .page-footer img {
                  width: 100%;
                  height: 100%;
                  object-fit: contain; /* mostra a matriz completa (sem cortar) */
                  object-position: bottom center;
                  display: block;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }

                /* Espaço reservado para o rodapé não sobrepor o conteúdo */
                .content-wrapper {
                  padding-bottom: 50mm;
                }

                @media print {
                  @page {
                    size: A4;
                    margin: 15mm 15mm 50mm 15mm;
                  }

                  html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #fff !important;
                    color: #000 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    color-adjust: exact !important;
                  }

                  .no-print {
                    display: none !important;
                  }

                  .page-footer {
                    position: fixed !important;
                    bottom: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    width: 100% !important;
                    height: 45mm !important; /* IMPORTANTE: não deixar auto (cobria o texto) */
                    margin: 0 !important;
                    padding: 0 !important;
                  }

                  .page-footer img {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: contain !important;
                    object-position: bottom center !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    color-adjust: exact !important;
                  }

                  .content-wrapper {
                    padding-bottom: 50mm;
                  }
                }

                @media screen {
                  body {
                    max-width: 800px;
                    margin: 0 auto;
                    background: #f5f5f5;
                  }

                  .content-wrapper {
                    background: white;
                    min-height: 100vh;
                    padding-bottom: 50mm;
                  }

                  .page-footer {
                    position: fixed;
                    bottom: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    max-width: 800px;
                    width: 100%;
                    height: 45mm;
                    background: white;
                  }
                }
              </style>
            </head>
            <body>
              <div class="content-wrapper">
                <div class="print-info no-print">
                  Impresso por: ${userName} em ${new Date().toLocaleString('pt-BR')}
                </div>
                <div class="no-print" style="padding: 15mm 15mm 0 15mm; margin-bottom: 20px;">
                  <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">Imprimir / Salvar PDF</button>
                  <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Fechar</button>
                </div>
                
                <!-- Cabeçalho centralizado com logo e título -->
                <div class="contract-header">
                  <img src="${logoBase64}" alt="Fundação Dom Bosco" />
                  <h1>Contrato de Prestação de Serviços</h1>
                  <h2>Avaliação Neuropsicológica</h2>
                  <p class="client-name">${contractData.clientName}</p>
                </div>
                
                <div class="contract-content">${contractContent}</div>
              </div>
              
              <!-- Rodapé com papel timbrado - final absoluto de cada página -->
              <div class="page-footer">
                <img src="${footerBase64}" alt="Papel Timbrado" />
              </div>
            </body>
          </html>
        `);
        newWindow.document.close();

        // Aguardar imagens carregarem antes de imprimir
        const waitForImages = (): Promise<void> => {
          return new Promise(resolve => {
            let attempts = 0;
            const maxAttempts = 30;
            const checkImages = () => {
              attempts++;
              const images = newWindow.document.querySelectorAll('img');
              let allLoaded = true;
              images.forEach((img: HTMLImageElement) => {
                if (!img.complete || img.naturalHeight === 0) {
                  allLoaded = false;
                }
              });
              if (allLoaded || attempts >= maxAttempts) {
                resolve();
              } else {
                setTimeout(checkImages, 100);
              }
            };

            // Dar tempo inicial para o documento carregar
            setTimeout(checkImages, 300);
          });
        };
        await waitForImages();
        newWindow.focus();
        newWindow.print();
      }
      toast({
        title: "Contrato processado com sucesso!",
        description: `Contrato impresso por ${userName}. ${contractData.paymentMethod === 'Combinado' && contractData.useCombinedPayment ? `Pagamento combinado (${contractData.paymentCombination.length} formas) registrado.` : contractData.paymentMethod === 'Manual' ? `Entrada de R$ ${contractData.downPaymentAmount || '0,00'} registrada.` : contractData.paymentMethod === 'Cartão' ? `Pagamento em ${contractData.creditCardInstallments}x registrado.` : 'Pagamento registrado.'}`
      });

      // Resetar form e fechar dialog
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Erro ao processar contrato:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao processar o contrato. Tente novamente."
      });
    } finally {
      setIsGenerating(false);
    }
  };
  const resetForm = () => {
    setContractData({
      contractType: 'Avaliação Neuropsicológica',
      clientId: '',
      clientName: '',
      clientCpf: '',
      responsibleName: '',
      responsibleCpf: '',
      address: '',
      paymentMethod: 'PIX',
      value: '',
      valueInWords: '',
      contractDate: new Date().toISOString().split('T')[0],
      creditCardInstallments: 1,
      downPaymentAmount: '',
      downPaymentMethod: 'Dinheiro',
      isManualCombination: false,
      paymentNotes: '',
      paymentCombination: [],
      useCombinedPayment: false,
      includeResponsible: false
    });
    setPaymentMethods([{
      method: 'cash',
      amount: 0,
      notes: ''
    }]);
  };
  const filteredClients = clients.filter(client => client.name.toLowerCase().includes(searchTerm.toLowerCase()) || client.cpf?.toLowerCase().includes(searchTerm.toLowerCase()));
  if (roleLoading) {
    return <div className="p-6">Carregando...</div>;
  }
  if (userRole !== 'director' && userRole !== 'coordinator_floresta') {
    return <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Acesso restrito a diretores e coordenadores do Floresta</p>
        </div>
      </div>;
  }
  return <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Geração de Contratos - Unidade Floresta</h1>
          <p className="text-sm text-muted-foreground">
            Crie contratos de avaliação neuropsicológica com valores personalizados
            {contractTemplate && <span className="ml-2 text-xs text-primary">
                • Template: {contractTemplate.name}
              </span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {(userRole === 'director' || userRole === 'coordinator_floresta') && <Button variant="outline" className="gap-2 flex-1 sm:flex-none" onClick={() => navigate('/contract-templates')}>
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Editar Templates</span>
              <span className="sm:hidden">Templates</span>
            </Button>}
          <Button variant="outline" className="gap-2 flex-1 sm:flex-none" onClick={() => navigate('/client-form')}>
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Paciente</span>
            <span className="sm:hidden">Paciente</span>
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={open => {
          setIsDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}>
            <DialogTrigger asChild>
              <Button className="gap-2 flex-1 sm:flex-none">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Contrato</span>
                <span className="sm:hidden">Contrato</span>
             </Button>
             </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Gerar Novo Contrato</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Seleção de Cliente */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">1. Selecionar Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientSearch">Buscar Cliente</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="clientSearch" placeholder="Digite o nome ou CPF do paciente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                    </div>
                  </div>
                  
                  {searchTerm && <div className="max-h-48 overflow-y-auto border rounded">
                      {filteredClients.map(client => <div key={client.id} className={`p-3 cursor-pointer hover:bg-muted border-b last:border-b-0 ${contractData.clientId === client.id ? 'bg-primary/10' : ''}`} onClick={() => {
                      handleClientSelect(client.id);
                      setSearchTerm('');
                    }}>
                          <div className="font-medium">{client.name}</div>
                          <div className="text-sm text-muted-foreground">
                            CPF: {client.cpf || 'Não informado'} | Unidade: Floresta
                          </div>
                        </div>)}
                    </div>}

                  {contractData.clientId && <div className="p-3 bg-green-50 border border-green-200 rounded">
                      <div className="flex items-center gap-2 text-green-700">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">Paciente Selecionado:</span>
                      </div>
                      <div className="mt-1 text-sm text-green-600">
                        {contractData.clientName} - {contractData.clientCpf || 'CPF não informado'}
                      </div>
                    </div>}
                </CardContent>
              </Card>

              {/* Dados do Contrato */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">2. Dados do Contrato</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contractType">Tipo de Contrato</Label>
                      <Select value={contractData.contractType} onValueChange={value => setContractData(prev => ({
                        ...prev,
                        contractType: value
                      }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Avaliação Neuropsicológica">Avaliação Neuropsicológica</SelectItem>
                          <SelectItem value="Terapia">Terapia</SelectItem>
                          <SelectItem value="Consultoria">Consultoria</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contractDate">Data do Contrato</Label>
                      <Input id="contractDate" type="date" value={contractData.contractDate} onChange={e => setContractData(prev => ({
                        ...prev,
                        contractDate: e.target.value
                      }))} />
                    </div>
                  </div>

                  {/* Toggle para incluir Responsável Financeiro */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-amber-50 dark:bg-amber-950 border-2 border-amber-300 dark:border-amber-700 rounded-lg mb-4 shadow-sm gap-3">
                    <Label htmlFor="includeResponsible" className="flex items-center gap-2 cursor-pointer font-medium">
                      <Users className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <span className="text-amber-800 dark:text-amber-200 text-sm sm:text-base">Incluir Responsável Financeiro no Contrato</span>
                    </Label>
                    <Switch id="includeResponsible" checked={contractData.includeResponsible} onCheckedChange={checked => setContractData(prev => ({
                      ...prev,
                      includeResponsible: checked
                    }))} className="data-[state=checked]:bg-amber-500 data-[state=unchecked]:bg-gray-300" />
                  </div>

                  {/* Dados do Responsável Financeiro (CONTRATANTE) - só aparece se toggle ativo */}
                  {contractData.includeResponsible && <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
                      <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3">
                        Responsável Financeiro (Contratante)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="responsibleName">Nome Completo</Label>
                          <Input id="responsibleName" value={contractData.responsibleName} onChange={e => setContractData(prev => ({
                          ...prev,
                          responsibleName: e.target.value
                        }))} placeholder="Nome completo do responsável financeiro" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="responsibleCpf">CPF</Label>
                          <Input id="responsibleCpf" value={contractData.responsibleCpf} onChange={e => setContractData(prev => ({
                          ...prev,
                          responsibleCpf: e.target.value
                        }))} placeholder="000.000.000-00" />
                        </div>
                      </div>
                    </div>}

                  {/* Dados do Beneficiário (PACIENTE) */}
                  <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg mb-4">
                    <h4 className="text-sm font-semibold text-green-700 dark:text-green-300 mb-3">
                      Beneficiário (Paciente)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="clientName">Nome Completo</Label>
                        <Input id="clientName" value={contractData.clientName} onChange={e => setContractData(prev => ({
                          ...prev,
                          clientName: e.target.value
                        }))} placeholder="Nome completo do paciente" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="clientCpf">CPF</Label>
                        <Input id="clientCpf" value={contractData.clientCpf} onChange={e => setContractData(prev => ({
                          ...prev,
                          clientCpf: e.target.value
                        }))} placeholder="000.000.000-00" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Endereço Completo</Label>
                    <Textarea id="address" value={contractData.address} onChange={e => setContractData(prev => ({
                      ...prev,
                      address: e.target.value
                    }))} placeholder="Endereço completo" />
                  </div>
                </CardContent>
              </Card>

              {/* Dados Financeiros */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">3. Dados Financeiros</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="value">Valor do Contrato (R$) *</Label>
                      <Input id="value" value={contractData.value} onChange={e => setContractData(prev => ({
                        ...prev,
                        value: e.target.value
                      }))} placeholder="1.600,00" required />
                      <p className="text-xs text-muted-foreground">
                        Use formato: 1.600,00 ou 800,00
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="valueInWords">Valor por Extenso *</Label>
                      <Input id="valueInWords" value={contractData.valueInWords} onChange={e => setContractData(prev => ({
                        ...prev,
                        valueInWords: e.target.value
                      }))} placeholder="mil e seiscentos reais" required />
                      <p className="text-xs text-muted-foreground">
                        Ex: oitocentos reais
                      </p>
                    </div>
                  </div>
                  
                  {/* Preview do valor */}
                  {contractData.value && contractData.valueInWords && <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded">
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        <div className="font-semibold">Valor Total do Contrato:</div>
                        <div className="text-lg font-bold mt-1">
                          R$ {contractData.value} ({contractData.valueInWords})
                        </div>
                      </div>
                    </div>}

                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Forma de Pagamento *</Label>
                    <Select value={contractData.paymentMethod} onValueChange={value => setContractData(prev => ({
                      ...prev,
                      paymentMethod: value
                    }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PIX">PIX</SelectItem>
                        <SelectItem value="Cartão">Cartão de Crédito</SelectItem>
                        <SelectItem value="Boleto">Boleto Bancário</SelectItem>
                        <SelectItem value="Transferência">Transferência Bancária</SelectItem>
                        <SelectItem value="Crédito">Crédito (Fiado)</SelectItem>
                        <SelectItem value="Combinado">Pagamento Combinado</SelectItem>
                        <SelectItem value="Manual">Pagamento Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Parcelas para Cartão de Crédito */}
                  {contractData.paymentMethod === 'Cartão' && <div className="space-y-2">
                      <Label htmlFor="creditCardInstallments">Número de Parcelas</Label>
                      <Select value={contractData.creditCardInstallments.toString()} onValueChange={value => setContractData(prev => ({
                      ...prev,
                      creditCardInstallments: parseInt(value)
                    }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => <SelectItem key={num} value={num.toString()}>
                              {num}x de R$ {(parseContractValue(contractData.value) / num).toFixed(2).replace('.', ',')}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>}

                  {/* Pagamento Combinado */}
                  {contractData.paymentMethod === 'Combinado' && <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                      <div className="space-y-2">
                        <Label className="text-base font-semibold">Configuração de Pagamento Combinado</Label>
                        <p className="text-sm text-muted-foreground">
                          Configure múltiplas formas de pagamento para o mesmo contrato
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 mb-4">
                        <input type="checkbox" id="useCombined" checked={contractData.useCombinedPayment} onChange={e => {
                        setContractData({
                          ...contractData,
                          useCombinedPayment: e.target.checked
                        });
                        if (!e.target.checked) {
                          setPaymentMethods([{
                            method: 'cash',
                            amount: 0,
                            notes: ''
                          }]);
                        }
                      }} className="h-4 w-4" />
                        <Label htmlFor="useCombined">Usar múltiplas formas de pagamento</Label>
                      </div>

                      {contractData.useCombinedPayment && <>
                          <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">Formas de Pagamento</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addPaymentMethod}>
                              <Plus className="h-4 w-4 mr-1" />
                              Adicionar
                            </Button>
                          </div>

                          {paymentMethods.map((pm, index) => <div key={index} className="grid grid-cols-12 gap-2 items-end">
                              {/* Forma de Pagamento */}
                              <div className="col-span-5 space-y-2">
                                <Label>Método {index + 1}</Label>
                                <Select value={pm.method} onValueChange={value => updatePaymentMethod(index, 'method', value)}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="cash">Dinheiro</SelectItem>
                                    <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                                    <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                                    <SelectItem value="pix">PIX</SelectItem>
                                    <SelectItem value="bank_transfer">Transferência</SelectItem>
                                    <SelectItem value="bank_slip">Boleto</SelectItem>
                                    <SelectItem value="check">Cheque</SelectItem>
                                    <SelectItem value="credit">Crédito (Fiado)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Valor */}
                              <div className="col-span-3 space-y-2">
                                <Label>Valor (R$)</Label>
                                <Input type="number" step="0.01" value={pm.amount} onChange={e => updatePaymentMethod(index, 'amount', parseFloat(e.target.value) || 0)} placeholder="0,00" />
                              </div>

                              {/* Observação */}
                              <div className="col-span-3 space-y-2">
                                <Label>Obs.</Label>
                                <Input type="text" value={pm.notes || ''} onChange={e => updatePaymentMethod(index, 'notes', e.target.value)} placeholder="Opcional" />
                              </div>

                              {/* Botão Remover */}
                              <div className="col-span-1">
                                {paymentMethods.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => removePaymentMethod(index)} className="text-destructive">
                                    <X className="h-4 w-4" />
                                  </Button>}
                              </div>
                            </div>)}

                          {/* Mostrar total calculado */}
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-sm text-muted-foreground">Total Combinado:</span>
                            <span className="text-lg font-bold">
                              R$ {getTotalFromCombinedPayments().toFixed(2).replace('.', ',')}
                            </span>
                          </div>

                          {/* Validação: checar se o total bate */}
                          {Math.abs(getTotalFromCombinedPayments() - parseContractValue(contractData.value)) > 0.01 && contractData.value && <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded">
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                              <div className="flex-1 text-sm text-destructive">
                                <div className="font-semibold">Atenção: Valores não conferem</div>
                                <div className="text-xs mt-1">
                                  Total do contrato: R$ {parseContractValue(contractData.value).toFixed(2)} | 
                                  Soma dos métodos: R$ {getTotalFromCombinedPayments().toFixed(2)} | 
                                  Diferença: R$ {Math.abs(getTotalFromCombinedPayments() - parseContractValue(contractData.value)).toFixed(2)}
                                </div>
                              </div>
                            </div>}
                        </>}

                      {!contractData.useCombinedPayment && <div className="text-sm text-muted-foreground text-center py-4">
                          Marque a opção acima para configurar múltiplas formas de pagamento
                        </div>}
                    </div>}

                  {/* Modo Manual */}
                  {contractData.paymentMethod === 'Manual' && <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                      <div className="space-y-2">
                        <Label className="text-base font-semibold">Configuração de Pagamento Manual</Label>
                        <p className="text-sm text-muted-foreground">
                          Configure entradas, parcelas e diferentes formas de pagamento
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="downPaymentAmount">Valor da Entrada (R$)</Label>
                          <Input id="downPaymentAmount" value={contractData.downPaymentAmount} onChange={e => setContractData(prev => ({
                          ...prev,
                          downPaymentAmount: e.target.value
                        }))} placeholder="0,00" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="downPaymentMethod">Forma de Pagamento da Entrada</Label>
                          <Select value={contractData.downPaymentMethod} onValueChange={value => setContractData(prev => ({
                          ...prev,
                          downPaymentMethod: value
                        }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                              <SelectItem value="PIX">PIX</SelectItem>
                              <SelectItem value="Cartão Débito">Cartão de Débito</SelectItem>
                              <SelectItem value="Transferência">Transferência</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="paymentNotes">Observações sobre o Pagamento</Label>
                        <Textarea id="paymentNotes" value={contractData.paymentNotes} onChange={e => setContractData(prev => ({
                        ...prev,
                        paymentNotes: e.target.value
                      }))} placeholder="Ex: Restante em 3 parcelas no boleto, primeira em 30 dias..." rows={3} />
                      </div>

                      {contractData.downPaymentAmount && <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                          <div className="text-sm text-blue-700">
                            <div className="font-semibold mb-1">Resumo do Pagamento:</div>
                            <div>• Entrada: R$ {contractData.downPaymentAmount} ({contractData.downPaymentMethod})</div>
                            <div>• Restante: R$ {(parseContractValue(contractData.value) - parseFloat(contractData.downPaymentAmount.replace(',', '.') || '0')).toFixed(2).replace('.', ',')}</div>
                          </div>
                        </div>}
                    </div>}
                </CardContent>
              </Card>

              {/* Botões de Ação */}
              <div className="flex flex-col sm:flex-row gap-2 justify-end">
                  <Button onClick={handleDownloadWord} className="gap-2" disabled={!contractData.clientId || !contractData.value || !contractData.valueInWords || isGenerating}>
                    <Download className="h-4 w-4" />
                    {isGenerating ? 'Gerando...' : contractData.value ? `Baixar Word + Registrar R$ ${contractData.value}` : 'Preencha os dados do contrato'}
                  </Button>
                  
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      </div>

      {/* Lista de Pacientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Pacientes da Unidade Floresta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar paciente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>

            {loading ? <div className="text-center py-8">Carregando pacientes...</div> : <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.length > 0 ? filteredClients.map(client => <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>{client.cpf || 'Não informado'}</TableCell>
                        <TableCell>Floresta</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => {
                      handleClientSelect(client.id);
                      setIsDialogOpen(true);
                    }} className="gap-1">
                              <FileText className="h-3 w-3" />
                              Contrato
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>) : <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
                      </TableCell>
                    </TableRow>}
                </TableBody>
              </Table>}
          </div>
        </CardContent>
      </Card>
    </div>;
}