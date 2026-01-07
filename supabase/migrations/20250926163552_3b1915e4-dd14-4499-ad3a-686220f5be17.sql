-- Corrigir warnings de segurança - adicionar search_path a funções sem ele definido
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Corrigir a função update_payment_status para incluir search_path
CREATE OR REPLACE FUNCTION public.update_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;