-- Função para criar vínculo automático de cliente ao criar agendamento
CREATE OR REPLACE FUNCTION public.auto_assign_client_on_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se já existe um vínculo ativo
  IF NOT EXISTS (
    SELECT 1 FROM public.client_assignments
    WHERE client_id = NEW.client_id
    AND employee_id = NEW.employee_id
    AND is_active = true
  ) THEN
    -- Criar novo vínculo
    INSERT INTO public.client_assignments (
      client_id,
      employee_id,
      assigned_by,
      assigned_at,
      is_active
    ) VALUES (
      NEW.client_id,
      NEW.employee_id,
      COALESCE(NEW.created_by, auth.uid()),
      NOW(),
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para vincular automaticamente cliente ao profissional quando agendamento é criado
DROP TRIGGER IF EXISTS trigger_auto_assign_client ON public.schedules;
CREATE TRIGGER trigger_auto_assign_client
AFTER INSERT ON public.schedules
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_client_on_schedule();