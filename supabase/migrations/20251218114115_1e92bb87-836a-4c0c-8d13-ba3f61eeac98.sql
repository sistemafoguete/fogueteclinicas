-- Create contract_templates table
CREATE TABLE public.contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Directors can manage contract templates"
ON public.contract_templates
FOR ALL
USING (director_has_god_mode())
WITH CHECK (director_has_god_mode());

CREATE POLICY "Coordinators can view contract templates"
ON public.contract_templates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.employee_role IN ('coordinator_floresta', 'coordinator_madre', 'coordinator_atendimento_floresta')
    AND profiles.is_active = true
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_contract_templates_updated_at
BEFORE UPDATE ON public.contract_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default template with variables
INSERT INTO public.contract_templates (name, description, content, is_default, is_active)
VALUES (
  'Contrato Avaliação Neuropsicológica',
  'Template padrão para contratos de avaliação neuropsicológica',
  'Contrato de Prestação de Serviços
Avaliação Neuropsicológica

1. Das partes

{{TEXTO_PARTES}}

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

2.6.2. O valor referente à prestação de serviço de Avaliação Neuropsicológica à vista ou parcelado será no total de R$ {{VALOR}} ({{VALOR_EXTENSO}})

O pagamento dos honorários referentes ao serviço de Avaliação Neuropsicológica será efetuado:

{{FORMA_PAGAMENTO}}

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


Belo Horizonte, {{DATA_DIA}} de {{DATA_MES}} de {{DATA_ANO}}.

__________________________________________________
Contratada

___________________________________________________
Contratante',
  true,
  true
);