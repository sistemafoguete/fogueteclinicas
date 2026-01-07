-- Primeiro, vamos verificar e corrigir as permissões de relatórios

-- Permitir que todos os funcionários ativos visualizem relatórios básicos
DROP POLICY IF EXISTS "Staff can view reports" ON attendance_reports;
CREATE POLICY "Staff can view reports" 
ON attendance_reports 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

DROP POLICY IF EXISTS "Staff can view employee reports" ON employee_reports;
CREATE POLICY "Staff can view employee reports" 
ON employee_reports 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

-- Permitir que coordenadores e diretores vejam relatórios financeiros
DROP POLICY IF EXISTS "Managers can view financial records" ON financial_records;
CREATE POLICY "Managers can view financial records" 
ON financial_records 
FOR SELECT 
USING (
  user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role, 'financeiro'::employee_role])
);

-- Permitir que todos vejam relatórios automáticos de financeiro
DROP POLICY IF EXISTS "Staff can view automatic financial records" ON automatic_financial_records;
CREATE POLICY "Staff can view automatic financial records" 
ON automatic_financial_records 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

-- Atualizar função can_access_reports para ser mais permissiva
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
    AND employee_role IS NOT NULL
  );
$$;

-- Função para verificar se pode configurar relatórios (apenas diretores e coordenadores)
CREATE OR REPLACE FUNCTION public.can_configure_reports()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role]);
$$;