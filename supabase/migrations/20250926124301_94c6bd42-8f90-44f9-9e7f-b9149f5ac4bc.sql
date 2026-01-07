-- Criar tabela para notificações de agendamento
CREATE TABLE IF NOT EXISTS public.appointment_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  notification_type text NOT NULL DEFAULT 'appointment_scheduled'::text,
  title text NOT NULL,
  message text NOT NULL,
  appointment_date timestamp with time zone NOT NULL,
  appointment_time text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Habilitar RLS
ALTER TABLE public.appointment_notifications ENABLE ROW LEVEL SECURITY;

-- Política para funcionários verem apenas suas notificações
CREATE POLICY "Users can view their own appointment notifications"
ON public.appointment_notifications
FOR SELECT
USING (auth.uid() = employee_id);

-- Política para coordenadores e diretores criarem notificações
CREATE POLICY "Coordinators can create appointment notifications"
ON public.appointment_notifications
FOR INSERT
WITH CHECK (
  user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
  OR auth.uid() = created_by
);

-- Política para funcionários atualizarem suas notificações (marcar como lida)
CREATE POLICY "Users can update their own appointment notifications"
ON public.appointment_notifications
FOR UPDATE
USING (auth.uid() = employee_id)
WITH CHECK (auth.uid() = employee_id);

-- Função para criar notificação de agendamento
CREATE OR REPLACE FUNCTION public.create_appointment_notification(
  p_schedule_id uuid,
  p_employee_id uuid,
  p_client_id uuid,
  p_appointment_date timestamp with time zone,
  p_appointment_time text,
  p_service_type text DEFAULT 'Consulta'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  client_name TEXT;
  employee_name TEXT;
  notification_id UUID;
BEGIN
  -- Buscar nome do cliente
  SELECT name INTO client_name FROM clients WHERE id = p_client_id;
  
  -- Buscar nome do funcionário
  SELECT name INTO employee_name FROM profiles WHERE user_id = p_employee_id;
  
  -- Criar notificação
  INSERT INTO appointment_notifications (
    schedule_id,
    employee_id,
    client_id,
    title,
    message,
    appointment_date,
    appointment_time,
    created_by,
    metadata
  ) VALUES (
    p_schedule_id,
    p_employee_id,
    p_client_id,
    'Novo Agendamento',
    'Você tem um novo agendamento com ' || COALESCE(client_name, 'Cliente') || 
    ' marcado para ' || to_char(p_appointment_date, 'DD/MM/YYYY') || 
    ' às ' || p_appointment_time || ' (' || p_service_type || ')',
    p_appointment_date,
    p_appointment_time,
    auth.uid(),
    jsonb_build_object(
      'service_type', p_service_type,
      'client_name', client_name,
      'employee_name', employee_name
    )
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$function$;

-- Trigger para criar notificação automaticamente quando um agendamento for criado
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
      COALESCE(NEW.service_type, 'Consulta')
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar trigger para notificações automáticas
DROP TRIGGER IF EXISTS trigger_notify_appointment_created ON public.schedules;
CREATE TRIGGER trigger_notify_appointment_created
  AFTER INSERT ON public.schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_appointment_created();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_appointment_notifications_employee_id ON public.appointment_notifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_appointment_notifications_is_read ON public.appointment_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_appointment_notifications_created_at ON public.appointment_notifications(created_at);

-- Função para marcar notificação como lida
CREATE OR REPLACE FUNCTION public.mark_notification_as_read(p_notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE appointment_notifications 
  SET 
    is_read = true,
    read_at = NOW()
  WHERE id = p_notification_id 
    AND employee_id = auth.uid();
    
  RETURN FOUND;
END;
$function$;