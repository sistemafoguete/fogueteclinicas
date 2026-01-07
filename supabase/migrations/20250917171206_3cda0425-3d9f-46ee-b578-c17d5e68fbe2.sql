-- PRIMEIRO: Remover TODAS as políticas existentes de relatórios
DROP POLICY IF EXISTS "All active staff can view attendance reports" ON attendance_reports;
DROP POLICY IF EXISTS "Staff can view reports" ON attendance_reports;
DROP POLICY IF EXISTS "Directors can manage all attendance reports" ON attendance_reports;
DROP POLICY IF EXISTS "Coordinators can view attendance reports" ON attendance_reports;
DROP POLICY IF EXISTS "Directors and coordinators can view all attendance reports" ON attendance_reports;
DROP POLICY IF EXISTS "Directors and coordinators can manage attendance reports" ON attendance_reports;
DROP POLICY IF EXISTS "Employees can create reports for their sessions" ON attendance_reports;
DROP POLICY IF EXISTS "Employees can view their own reports" ON attendance_reports;

DROP POLICY IF EXISTS "All active staff can view employee reports" ON employee_reports;
DROP POLICY IF EXISTS "Staff can view employee reports" ON employee_reports;
DROP POLICY IF EXISTS "Directors can manage all employee reports" ON employee_reports;
DROP POLICY IF EXISTS "Coordinators can view reports" ON employee_reports;
DROP POLICY IF EXISTS "Directors and coordinators can view all employee reports" ON employee_reports;
DROP POLICY IF EXISTS "Directors and coordinators can manage employee reports" ON employee_reports;
DROP POLICY IF EXISTS "Users can create their own reports" ON employee_reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON employee_reports;

DROP POLICY IF EXISTS "Finance staff can view financial records" ON financial_records;
DROP POLICY IF EXISTS "Managers can view financial records" ON financial_records;
DROP POLICY IF EXISTS "Director god mode - financial_records" ON financial_records;
DROP POLICY IF EXISTS "Directors can manage all financial records" ON financial_records;
DROP POLICY IF EXISTS "Directors and coordinators can view all financial records" ON financial_records;
DROP POLICY IF EXISTS "Directors and coordinators can manage financial records" ON financial_records;

DROP POLICY IF EXISTS "All staff can view automatic financial records" ON automatic_financial_records;
DROP POLICY IF EXISTS "Coordinators can view financial records" ON automatic_financial_records;
DROP POLICY IF EXISTS "Directors can manage all attendance reports" ON automatic_financial_records;
DROP POLICY IF EXISTS "System can create financial records" ON automatic_financial_records;

-- SEGUNDO: Criar funções de verificação de permissões
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

-- TERCEIRO: Criar políticas NOVAS E SIMPLES
-- 1. Attendance Reports
CREATE POLICY "View attendance reports" ON attendance_reports FOR SELECT USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

CREATE POLICY "Manage attendance reports" ON attendance_reports FOR ALL USING (is_manager()) WITH CHECK (is_manager());

-- 2. Employee Reports  
CREATE POLICY "View employee reports" ON employee_reports FOR SELECT USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

CREATE POLICY "Manage employee reports" ON employee_reports FOR ALL USING (is_manager()) WITH CHECK (is_manager());

-- 3. Financial Records
CREATE POLICY "View financial records" ON financial_records FOR SELECT USING (
  is_manager() OR user_has_role(ARRAY['financeiro'::employee_role])
);

CREATE POLICY "Manage financial records" ON financial_records FOR ALL USING (
  is_manager() OR user_has_role(ARRAY['financeiro'::employee_role])
) WITH CHECK (
  is_manager() OR user_has_role(ARRAY['financeiro'::employee_role])
);

-- 4. Automatic Financial Records
CREATE POLICY "View automatic financial records" ON automatic_financial_records FOR SELECT USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

-- QUARTO: Atualizar as funções principais
CREATE OR REPLACE FUNCTION public.can_access_reports()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.can_configure_reports()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT is_manager();
$$;