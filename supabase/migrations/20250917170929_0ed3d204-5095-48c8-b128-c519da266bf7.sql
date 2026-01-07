-- Primeiro, vamos garantir que as funções de role funcionem corretamente
CREATE OR REPLACE FUNCTION public.user_has_role(required_roles employee_role[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = ANY(required_roles)
    AND is_active = true
  );
$$;

-- Função específica para verificar se é diretor
CREATE OR REPLACE FUNCTION public.is_director()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = 'director'::employee_role
    AND is_active = true
  );
$$;

-- Função específica para verificar se é coordenador
CREATE OR REPLACE FUNCTION public.is_coordinator()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND employee_role IN ('coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role)
    AND is_active = true
  );
$$;

-- Função para verificar se é diretor OU coordenador
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND employee_role IN ('director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role)
    AND is_active = true
  );
$$;

-- RECRIAR TODAS AS POLÍTICAS DE RELATÓRIOS COM ACESSO TOTAL PARA DIRETORES E COORDENADORES

-- 1. Attendance Reports - Diretores e coordenadores veem TUDO
DROP POLICY IF EXISTS "All active staff can view attendance reports" ON attendance_reports;
DROP POLICY IF EXISTS "Staff can view reports" ON attendance_reports;
DROP POLICY IF EXISTS "Directors can manage all attendance reports" ON attendance_reports;
DROP POLICY IF EXISTS "Coordinators can view attendance reports" ON attendance_reports;

CREATE POLICY "Directors and coordinators can view all attendance reports" 
ON attendance_reports 
FOR SELECT 
USING (
  is_manager() OR 
  (auth.uid() = employee_id) OR
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_active = true
    AND employee_role IS NOT NULL
  ))
);

CREATE POLICY "Directors and coordinators can manage attendance reports" 
ON attendance_reports 
FOR ALL
USING (is_manager())
WITH CHECK (is_manager());

-- 2. Employee Reports - Diretores e coordenadores veem TUDO
DROP POLICY IF EXISTS "All active staff can view employee reports" ON employee_reports;
DROP POLICY IF EXISTS "Staff can view employee reports" ON employee_reports;
DROP POLICY IF EXISTS "Directors can manage all employee reports" ON employee_reports;
DROP POLICY IF EXISTS "Coordinators can view reports" ON employee_reports;

CREATE POLICY "Directors and coordinators can view all employee reports" 
ON employee_reports 
FOR SELECT 
USING (
  is_manager() OR 
  (auth.uid() = employee_id) OR
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_active = true
    AND employee_role IS NOT NULL
  ))
);

CREATE POLICY "Directors and coordinators can manage employee reports" 
ON employee_reports 
FOR ALL
USING (is_manager())
WITH CHECK (is_manager());

-- 3. Financial Records - Diretores e coordenadores veem TUDO
DROP POLICY IF EXISTS "Finance staff can view financial records" ON financial_records;
DROP POLICY IF EXISTS "Managers can view financial records" ON financial_records;
DROP POLICY IF EXISTS "Director god mode - financial_records" ON financial_records;
DROP POLICY IF EXISTS "Directors can manage all financial records" ON financial_records;

CREATE POLICY "Directors and coordinators can view all financial records" 
ON financial_records 
FOR SELECT 
USING (
  is_manager() OR
  user_has_role(ARRAY['financeiro'::employee_role])
);

CREATE POLICY "Directors and coordinators can manage financial records" 
ON financial_records 
FOR ALL
USING (is_manager() OR user_has_role(ARRAY['financeiro'::employee_role]))
WITH CHECK (is_manager() OR user_has_role(ARRAY['financeiro'::employee_role]));

-- 4. Automatic Financial Records
DROP POLICY IF EXISTS "All staff can view automatic financial records" ON automatic_financial_records;
DROP POLICY IF EXISTS "Coordinators can view financial records" ON automatic_financial_records;

CREATE POLICY "All staff can view automatic financial records" 
ON automatic_financial_records 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_active = true
    AND employee_role IS NOT NULL
  )
);

-- 5. Garantir que profiles esteja acessível para verificações
DROP POLICY IF EXISTS "Staff can view clients for reports" ON clients;
CREATE POLICY "All staff can view clients" 
ON clients 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_active = true
    AND employee_role IS NOT NULL
  )
);

-- Função final para verificar acesso aos relatórios - SUPER PERMISSIVA
CREATE OR REPLACE FUNCTION public.can_access_reports()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.profiles WHERE user_id = auth.uid()),
    false
  );
$$;

-- Função para configurar relatórios - apenas diretores e coordenadores
CREATE OR REPLACE FUNCTION public.can_configure_reports()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT is_manager();
$$;

-- Função de debug para ver o que está acontecendo
CREATE OR REPLACE FUNCTION public.debug_my_permissions()
RETURNS TABLE(
  my_user_id uuid,
  my_role employee_role,
  is_active boolean,
  can_access_reports boolean,
  can_configure_reports boolean,
  is_manager boolean,
  is_director boolean,
  is_coordinator boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    p.user_id,
    p.employee_role,
    p.is_active,
    public.can_access_reports(),
    public.can_configure_reports(),
    public.is_manager(),
    public.is_director(),
    public.is_coordinator()
  FROM public.profiles p
  WHERE p.user_id = auth.uid();
$$;