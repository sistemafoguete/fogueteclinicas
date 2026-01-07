-- Criar função para depuração de permissões
CREATE OR REPLACE FUNCTION public.debug_user_permissions()
RETURNS TABLE(
  user_id uuid,
  employee_role employee_role,
  is_active boolean,
  can_access_reports boolean,
  profile_exists boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    p.user_id,
    p.employee_role,
    p.is_active,
    public.can_access_reports() as can_access_reports,
    true as profile_exists
  FROM public.profiles p
  WHERE p.user_id = auth.uid();
$$;

-- Garantir que todas as tabelas de relatórios tenham políticas corretas
-- Política mais ampla para attendance_reports
DROP POLICY IF EXISTS "All active staff can view attendance reports" ON attendance_reports;
CREATE POLICY "All active staff can view attendance reports" 
ON attendance_reports 
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

-- Política mais ampla para employee_reports
DROP POLICY IF EXISTS "All active staff can view employee reports" ON employee_reports;
CREATE POLICY "All active staff can view employee reports" 
ON employee_reports 
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

-- Política para financial_records - mais restritiva
DROP POLICY IF EXISTS "Finance staff can view financial records" ON financial_records;
CREATE POLICY "Finance staff can view financial records" 
ON financial_records 
FOR SELECT 
USING (
  user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role, 'financeiro'::employee_role])
);

-- Política para automatic_financial_records
DROP POLICY IF EXISTS "All staff can view automatic financial records" ON automatic_financial_records;
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

-- Política para clientes (necessário para os relatórios)
DROP POLICY IF EXISTS "Staff can view clients for reports" ON clients;
CREATE POLICY "Staff can view clients for reports" 
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

COMMENT ON FUNCTION public.debug_user_permissions() IS 'Função para debugar permissões do usuário - ajuda a identificar problemas de acesso aos relatórios';