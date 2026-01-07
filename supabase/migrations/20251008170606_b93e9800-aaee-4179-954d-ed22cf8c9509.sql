-- Corrigir função para calcular data de vencimento com search_path
CREATE OR REPLACE FUNCTION calculate_feedback_deadline(start_date DATE)
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
  WHILE business_days < 15 LOOP
    calc_date := calc_date + INTERVAL '1 day';
    day_of_week := EXTRACT(DOW FROM calc_date);
    
    IF day_of_week NOT IN (0, 6) THEN
      business_days := business_days + 1;
    END IF;
  END LOOP;
  
  RETURN calc_date;
END;
$$;

-- Corrigir função update_feedback_control_updated_at com search_path
CREATE OR REPLACE FUNCTION update_feedback_control_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Corrigir função set_feedback_deadline com search_path
CREATE OR REPLACE FUNCTION set_feedback_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.deadline_date IS NULL THEN
    NEW.deadline_date := calculate_feedback_deadline(CURRENT_DATE);
  END IF;
  RETURN NEW;
END;
$$;