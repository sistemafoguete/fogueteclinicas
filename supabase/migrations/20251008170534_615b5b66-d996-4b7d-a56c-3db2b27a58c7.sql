-- Criar tabela de controle de devolutiva
CREATE TABLE IF NOT EXISTS public.client_feedback_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deadline_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, overdue
  report_attached BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(client_id)
);

-- Habilitar RLS
ALTER TABLE public.client_feedback_control ENABLE ROW LEVEL SECURITY;

-- Política para diretores e coordenadores floresta
CREATE POLICY "Diretores e coordenadores floresta podem gerenciar devolutivas"
ON public.client_feedback_control
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND employee_role IN ('director', 'coordinator_floresta')
    AND is_active = true
  )
);

-- Criar índices para performance
CREATE INDEX idx_feedback_control_client ON public.client_feedback_control(client_id);
CREATE INDEX idx_feedback_control_status ON public.client_feedback_control(status);
CREATE INDEX idx_feedback_control_deadline ON public.client_feedback_control(deadline_date);

-- Função para calcular data de vencimento (15 dias úteis)
CREATE OR REPLACE FUNCTION calculate_feedback_deadline(start_date DATE)
RETURNS DATE
LANGUAGE plpgsql
AS $$
DECLARE
  calc_date DATE := start_date;
  business_days INTEGER := 0;
  day_of_week INTEGER;
BEGIN
  WHILE business_days < 15 LOOP
    calc_date := calc_date + INTERVAL '1 day';
    day_of_week := EXTRACT(DOW FROM calc_date);
    
    -- Pular finais de semana (0 = Domingo, 6 = Sábado)
    IF day_of_week NOT IN (0, 6) THEN
      business_days := business_days + 1;
    END IF;
  END LOOP;
  
  RETURN calc_date;
END;
$$;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_feedback_control_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_feedback_control_timestamp
BEFORE UPDATE ON public.client_feedback_control
FOR EACH ROW
EXECUTE FUNCTION update_feedback_control_updated_at();

-- Trigger para calcular deadline automaticamente
CREATE OR REPLACE FUNCTION set_feedback_deadline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deadline_date IS NULL THEN
    NEW.deadline_date := calculate_feedback_deadline(CURRENT_DATE);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_deadline_on_insert
BEFORE INSERT ON public.client_feedback_control
FOR EACH ROW
EXECUTE FUNCTION set_feedback_deadline();