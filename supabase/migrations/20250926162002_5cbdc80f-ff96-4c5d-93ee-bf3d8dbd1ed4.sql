-- Criar tabela para controle de pagamentos e parcelas
CREATE TABLE public.client_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('avista', 'aprazo')),
  installments_total INTEGER DEFAULT 1,
  installments_paid INTEGER DEFAULT 0,
  amount_paid NUMERIC(10,2) DEFAULT 0,
  amount_remaining NUMERIC(10,2) NOT NULL,
  description TEXT,
  due_date DATE,
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  unit TEXT NOT NULL DEFAULT 'madre',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'completed', 'overdue'))
);

-- Criar tabela para registrar cada parcela individualmente
CREATE TABLE public.payment_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_payment_id UUID NOT NULL REFERENCES public.client_payments(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  paid_amount NUMERIC(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'overdue')),
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  paid_by UUID
);

-- Habilitar RLS
ALTER TABLE public.client_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_installments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para client_payments - apenas coordenadores e diretores da unidade madre
CREATE POLICY "Coordenadores e diretores podem gerenciar pagamentos da madre" 
ON public.client_payments 
FOR ALL 
USING (
  unit = 'madre' AND
  user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role])
)
WITH CHECK (
  unit = 'madre' AND
  user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role])
);

-- Políticas RLS para payment_installments - apenas coordenadores e diretores
CREATE POLICY "Coordenadores e diretores podem gerenciar parcelas" 
ON public.payment_installments 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.client_payments cp 
    WHERE cp.id = payment_installments.client_payment_id 
    AND cp.unit = 'madre'
    AND user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_payments cp 
    WHERE cp.id = payment_installments.client_payment_id 
    AND cp.unit = 'madre'
    AND user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role])
  )
);

-- Função para atualizar o status do pagamento baseado nas parcelas
CREATE OR REPLACE FUNCTION public.update_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  payment_record RECORD;
  total_paid NUMERIC := 0;
  pending_count INTEGER := 0;
BEGIN
  -- Buscar informações do pagamento
  SELECT * INTO payment_record 
  FROM public.client_payments 
  WHERE id = COALESCE(NEW.client_payment_id, OLD.client_payment_id);
  
  -- Calcular total pago e parcelas pendentes
  SELECT 
    COALESCE(SUM(paid_amount), 0),
    COUNT(*) FILTER (WHERE status IN ('pending', 'partial'))
  INTO total_paid, pending_count
  FROM public.payment_installments 
  WHERE client_payment_id = payment_record.id;
  
  -- Atualizar status do pagamento principal
  UPDATE public.client_payments 
  SET 
    amount_paid = total_paid,
    amount_remaining = total_amount - total_paid,
    installments_paid = (
      SELECT COUNT(*) FROM public.payment_installments 
      WHERE client_payment_id = payment_record.id AND status = 'paid'
    ),
    status = CASE 
      WHEN total_paid = 0 THEN 'pending'
      WHEN total_paid >= payment_record.total_amount THEN 'completed'
      WHEN total_paid > 0 THEN 'partial'
      ELSE 'pending'
    END,
    updated_at = NOW()
  WHERE id = payment_record.id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para atualizar status automaticamente
CREATE TRIGGER update_payment_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_installments
  FOR EACH ROW EXECUTE FUNCTION public.update_payment_status();

-- Função para criar parcelas automaticamente
CREATE OR REPLACE FUNCTION public.create_payment_installments(
  p_client_payment_id UUID,
  p_installments_total INTEGER,
  p_total_amount NUMERIC,
  p_first_due_date DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  installment_amount NUMERIC;
  i INTEGER;
BEGIN
  -- Calcular valor por parcela
  installment_amount := p_total_amount / p_installments_total;
  
  -- Criar as parcelas
  FOR i IN 1..p_installments_total LOOP
    INSERT INTO public.payment_installments (
      client_payment_id,
      installment_number,
      amount,
      due_date
    ) VALUES (
      p_client_payment_id,
      i,
      CASE 
        -- Última parcela pega o resto da divisão para evitar problemas de arredondamento
        WHEN i = p_installments_total THEN p_total_amount - (installment_amount * (i - 1))
        ELSE installment_amount
      END,
      p_first_due_date + INTERVAL '1 month' * (i - 1)
    );
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para atualizar timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_client_payments_updated_at
  BEFORE UPDATE ON public.client_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_installments_updated_at
  BEFORE UPDATE ON public.payment_installments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();