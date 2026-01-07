-- Corrigir trigger que usa campo service_type inexistente
CREATE OR REPLACE FUNCTION public.notify_appointment_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Só criar notificação se for um novo agendamento (não atualização)
  IF TG_OP = 'INSERT' THEN
    PERFORM create_appointment_notification(
      NEW.id,
      NEW.employee_id,
      NEW.client_id,
      NEW.start_time,
      to_char(NEW.start_time, 'HH24:MI'),
      COALESCE(NEW.title, 'Consulta')  -- Usar title em vez de service_type
    );
  END IF;
  
  RETURN NEW;
END;
$function$;