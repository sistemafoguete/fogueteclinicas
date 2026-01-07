-- Corrigir função de cálculo de 15 dias úteis (segunda a sexta)
CREATE OR REPLACE FUNCTION public.calculate_feedback_deadline(start_date DATE)
RETURNS DATE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calc_date DATE := start_date;
  business_days INTEGER := 0;
  day_of_week INTEGER;
BEGIN
  -- Começar a contar a partir do dia seguinte ao lançamento
  calc_date := calc_date + INTERVAL '1 day';
  
  WHILE business_days < 15 LOOP
    day_of_week := EXTRACT(DOW FROM calc_date);
    
    -- DOW: 0 = Domingo, 6 = Sábado
    -- Contar apenas de segunda (1) a sexta (5)
    IF day_of_week NOT IN (0, 6) THEN
      business_days := business_days + 1;
    END IF;
    
    -- Se ainda não completou 15 dias, avança para o próximo dia
    IF business_days < 15 THEN
      calc_date := calc_date + INTERVAL '1 day';
    END IF;
  END LOOP;
  
  RETURN calc_date;
END;
$$;

-- Atualizar todos os registros existentes com o cálculo correto
UPDATE public.client_feedback_control 
SET deadline_date = calculate_feedback_deadline(started_at::DATE)
WHERE status != 'completed';