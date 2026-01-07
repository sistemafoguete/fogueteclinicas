-- Corrigir cálculo de deadline para usar started_at ao invés de CURRENT_DATE
CREATE OR REPLACE FUNCTION public.set_feedback_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Calcular deadline baseado em started_at (15 dias úteis após o lançamento)
  IF NEW.deadline_date IS NULL THEN
    NEW.deadline_date := calculate_feedback_deadline(NEW.started_at::DATE);
  END IF;
  RETURN NEW;
END;
$$;