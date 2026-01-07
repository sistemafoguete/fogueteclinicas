-- Primeiro, vamos atualizar o enum de roles para incluir todos os cargos definidos
DROP TYPE IF EXISTS employee_role CASCADE;
CREATE TYPE employee_role AS ENUM (
  'director',
  'coordinator_madre', 
  'coordinator_floresta',
  'staff',
  'receptionist',
  'psychologist',
  'psychopedagogue', 
  'musictherapist',
  'speech_therapist',
  'nutritionist',
  'physiotherapist',
  'financeiro',
  'intern'
);

-- Função para verificar se um usuário tem um dos roles permitidos
CREATE OR REPLACE FUNCTION user_has_any_role(allowed_roles employee_role[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = ANY(allowed_roles)
  );
$$;

-- Função para obter o role do usuário atual
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS employee_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT employee_role FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Função para verificar se usuário pode ver todos os clientes
CREATE OR REPLACE FUNCTION can_view_all_clients()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER  
SET search_path = 'public'
AS $$
  SELECT user_has_any_role(ARRAY['director', 'coordinator_madre', 'coordinator_floresta', 'receptionist']::employee_role[]);
$$;

-- Função para verificar se usuário pode ver dados financeiros
CREATE OR REPLACE FUNCTION can_access_financial()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public' 
AS $$
  SELECT user_has_any_role(ARRAY['director', 'financeiro']::employee_role[]);
$$;

-- Função para verificar se usuário pode gerenciar estoque
CREATE OR REPLACE FUNCTION can_manage_stock()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT user_has_any_role(ARRAY['director', 'financeiro']::employee_role[]);
$$;