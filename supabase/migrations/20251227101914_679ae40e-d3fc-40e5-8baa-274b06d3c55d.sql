-- Tabela para perguntas de cada tipo de anamnese
CREATE TABLE public.anamnesis_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  anamnesis_type_id UUID NOT NULL REFERENCES public.anamnesis_types(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'text', -- text, textarea, select, radio, checkbox, date, number
  options JSONB, -- Para questões de múltipla escolha
  is_required BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para fichas de anamnese preenchidas
CREATE TABLE public.anamnesis_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  anamnesis_type_id UUID NOT NULL REFERENCES public.anamnesis_types(id),
  filled_by UUID NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, completed
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.anamnesis_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamnesis_records ENABLE ROW LEVEL SECURITY;

-- Políticas para perguntas (leitura para todos autenticados)
CREATE POLICY "Authenticated users can view anamnesis questions"
  ON public.anamnesis_questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Coordinators can manage anamnesis questions"
  ON public.anamnesis_questions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Políticas para fichas de anamnese
CREATE POLICY "Authenticated users can view anamnesis records"
  ON public.anamnesis_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create anamnesis records"
  ON public.anamnesis_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own anamnesis records"
  ON public.anamnesis_records FOR UPDATE
  TO authenticated
  USING (filled_by = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND employee_role IN ('director', 'coordinator_madre', 'coordinator_floresta')
  ));

-- Índices para performance
CREATE INDEX idx_anamnesis_questions_type ON public.anamnesis_questions(anamnesis_type_id);
CREATE INDEX idx_anamnesis_records_client ON public.anamnesis_records(client_id);
CREATE INDEX idx_anamnesis_records_type ON public.anamnesis_records(anamnesis_type_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_anamnesis_records_updated_at
  BEFORE UPDATE ON public.anamnesis_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();