-- Criar tabela de permissões por cargo
CREATE TYPE public.permission_type AS ENUM (
  'view_clients', 'create_clients', 'edit_clients', 'delete_clients',
  'view_employees', 'create_employees', 'edit_employees', 'delete_employees',
  'view_financial', 'create_financial', 'edit_financial', 'delete_financial',
  'view_schedules', 'create_schedules', 'edit_schedules', 'delete_schedules',
  'view_stock', 'create_stock', 'edit_stock', 'delete_stock',
  'view_reports', 'create_reports', 'edit_reports', 'delete_reports',
  'view_documents', 'create_documents', 'edit_documents', 'delete_documents',
  'manage_roles', 'manage_permissions', 'view_audit_logs', 'system_admin'
);

-- Criar tabela de permissões por cargo
CREATE TABLE public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_role public.employee_role NOT NULL,
  permission public.permission_type NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_role, permission)
);

-- Habilitar RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas para role_permissions
CREATE POLICY "Directors can manage all role permissions" 
ON public.role_permissions 
FOR ALL 
USING (user_has_role(ARRAY['director'::employee_role]));

CREATE POLICY "Users can view role permissions" 
ON public.role_permissions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Inserir permissões padrão para cada cargo

-- Director (acesso total)
INSERT INTO public.role_permissions (employee_role, permission, granted) VALUES
('director', 'view_clients', true),
('director', 'create_clients', true),
('director', 'edit_clients', true),
('director', 'delete_clients', true),
('director', 'view_employees', true),
('director', 'create_employees', true),
('director', 'edit_employees', true),
('director', 'delete_employees', true),
('director', 'view_financial', true),
('director', 'create_financial', true),
('director', 'edit_financial', true),
('director', 'delete_financial', true),
('director', 'view_schedules', true),
('director', 'create_schedules', true),
('director', 'edit_schedules', true),
('director', 'delete_schedules', true),
('director', 'view_stock', true),
('director', 'create_stock', true),
('director', 'edit_stock', true),
('director', 'delete_stock', true),
('director', 'view_reports', true),
('director', 'create_reports', true),
('director', 'edit_reports', true),
('director', 'delete_reports', true),
('director', 'view_documents', true),
('director', 'create_documents', true),
('director', 'edit_documents', true),
('director', 'delete_documents', true),
('director', 'manage_roles', true),
('director', 'manage_permissions', true),
('director', 'view_audit_logs', true),
('director', 'system_admin', true);

-- Coordinators (acesso amplo mas limitado)
INSERT INTO public.role_permissions (employee_role, permission, granted) VALUES
('coordinator_madre', 'view_clients', true),
('coordinator_madre', 'create_clients', true),
('coordinator_madre', 'edit_clients', true),
('coordinator_madre', 'view_employees', true),
('coordinator_madre', 'view_financial', true),
('coordinator_madre', 'view_schedules', true),
('coordinator_madre', 'create_schedules', true),
('coordinator_madre', 'edit_schedules', true),
('coordinator_madre', 'view_stock', true),
('coordinator_madre', 'create_stock', true),
('coordinator_madre', 'edit_stock', true),
('coordinator_madre', 'view_reports', true),
('coordinator_madre', 'create_reports', true),
('coordinator_madre', 'view_documents', true),
('coordinator_madre', 'create_documents', true),
('coordinator_madre', 'edit_documents', true);

INSERT INTO public.role_permissions (employee_role, permission, granted) VALUES
('coordinator_floresta', 'view_clients', true),
('coordinator_floresta', 'create_clients', true),
('coordinator_floresta', 'edit_clients', true),
('coordinator_floresta', 'view_employees', true),
('coordinator_floresta', 'view_financial', true),
('coordinator_floresta', 'view_schedules', true),
('coordinator_floresta', 'create_schedules', true),
('coordinator_floresta', 'edit_schedules', true),
('coordinator_floresta', 'view_stock', true),
('coordinator_floresta', 'create_stock', true),
('coordinator_floresta', 'edit_stock', true),
('coordinator_floresta', 'view_reports', true),
('coordinator_floresta', 'create_reports', true),
('coordinator_floresta', 'view_documents', true),
('coordinator_floresta', 'create_documents', true),
('coordinator_floresta', 'edit_documents', true);

-- Staff geral (acesso básico)
INSERT INTO public.role_permissions (employee_role, permission, granted) VALUES
('staff', 'view_clients', true),
('staff', 'view_schedules', true),
('staff', 'create_schedules', true),
('staff', 'view_documents', true),
('staff', 'create_documents', true);

-- Profissionais de saúde (acesso específico)
INSERT INTO public.role_permissions (employee_role, permission, granted) VALUES
('psychologist', 'view_clients', true),
('psychologist', 'create_clients', true),
('psychologist', 'edit_clients', true),
('psychologist', 'view_schedules', true),
('psychologist', 'create_schedules', true),
('psychologist', 'edit_schedules', true),
('psychologist', 'view_documents', true),
('psychologist', 'create_documents', true),
('psychologist', 'edit_documents', true),
('psychologist', 'view_reports', true);

INSERT INTO public.role_permissions (employee_role, permission, granted) VALUES
('psychopedagogue', 'view_clients', true),
('psychopedagogue', 'create_clients', true),
('psychopedagogue', 'edit_clients', true),
('psychopedagogue', 'view_schedules', true),
('psychopedagogue', 'create_schedules', true),
('psychopedagogue', 'edit_schedules', true),
('psychopedagogue', 'view_documents', true),
('psychopedagogue', 'create_documents', true),
('psychopedagogue', 'edit_documents', true),
('psychopedagogue', 'view_reports', true);

INSERT INTO public.role_permissions (employee_role, permission, granted) VALUES
('speech_therapist', 'view_clients', true),
('speech_therapist', 'create_clients', true),
('speech_therapist', 'edit_clients', true),
('speech_therapist', 'view_schedules', true),
('speech_therapist', 'create_schedules', true),
('speech_therapist', 'edit_schedules', true),
('speech_therapist', 'view_documents', true),
('speech_therapist', 'create_documents', true),
('speech_therapist', 'edit_documents', true),
('speech_therapist', 'view_reports', true);

INSERT INTO public.role_permissions (employee_role, permission, granted) VALUES
('nutritionist', 'view_clients', true),
('nutritionist', 'view_schedules', true),
('nutritionist', 'create_schedules', true),
('nutritionist', 'edit_schedules', true),
('nutritionist', 'view_documents', true),
('nutritionist', 'create_documents', true),
('nutritionist', 'edit_documents', true),
('nutritionist', 'view_reports', true);

INSERT INTO public.role_permissions (employee_role, permission, granted) VALUES
('physiotherapist', 'view_clients', true),
('physiotherapist', 'view_schedules', true),
('physiotherapist', 'create_schedules', true),
('physiotherapist', 'edit_schedules', true),
('physiotherapist', 'view_documents', true),
('physiotherapist', 'create_documents', true),
('physiotherapist', 'edit_documents', true),
('physiotherapist', 'view_reports', true);

INSERT INTO public.role_permissions (employee_role, permission, granted) VALUES
('musictherapist', 'view_clients', true),
('musictherapist', 'view_schedules', true),
('musictherapist', 'create_schedules', true),
('musictherapist', 'edit_schedules', true),
('musictherapist', 'view_documents', true),
('musictherapist', 'create_documents', true),
('musictherapist', 'edit_documents', true),
('musictherapist', 'view_reports', true);

-- Financeiro
INSERT INTO public.role_permissions (employee_role, permission, granted) VALUES
('financeiro', 'view_financial', true),
('financeiro', 'create_financial', true),
('financeiro', 'edit_financial', true),
('financeiro', 'view_reports', true),
('financeiro', 'create_reports', true),
('financeiro', 'view_documents', true),
('financeiro', 'create_documents', true),
('financeiro', 'edit_documents', true);

-- Recepcionista
INSERT INTO public.role_permissions (employee_role, permission, granted) VALUES
('receptionist', 'view_clients', true),
('receptionist', 'view_schedules', true),
('receptionist', 'create_schedules', true),
('receptionist', 'edit_schedules', true),
('receptionist', 'view_documents', true);

-- Estagiário (acesso limitado)
INSERT INTO public.role_permissions (employee_role, permission, granted) VALUES
('intern', 'view_clients', true),
('intern', 'view_schedules', true),
('intern', 'view_documents', true);

-- Função para verificar permissões
CREATE OR REPLACE FUNCTION public.user_has_permission(required_permission permission_type)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles p
    JOIN public.role_permissions rp ON rp.employee_role = p.employee_role
    WHERE p.user_id = auth.uid() 
    AND rp.permission = required_permission 
    AND rp.granted = true
  );
$function$;

-- Função para obter todas as permissões do usuário
CREATE OR REPLACE FUNCTION public.get_user_permissions()
RETURNS TABLE (permission permission_type)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT rp.permission
  FROM public.profiles p
  JOIN public.role_permissions rp ON rp.employee_role = p.employee_role
  WHERE p.user_id = auth.uid() 
  AND rp.granted = true;
$function$;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_role_permissions_updated_at
BEFORE UPDATE ON public.role_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();