-- Verificar e ajustar as políticas RLS para diretores terem acesso total

-- Atualizar a política de clientes para garantir que diretores vejam todas as unidades
DROP POLICY IF EXISTS "Directors can manage all clients" ON public.clients;
DROP POLICY IF EXISTS "Manage clients based on unit access" ON public.clients;

-- Política de acesso total para diretores (god mode)
CREATE POLICY "Directors have full access to all clients"
ON public.clients
FOR ALL
TO authenticated
USING (
  director_has_god_mode()
)
WITH CHECK (
  director_has_god_mode()
);

-- Política para coordenadores baseada na unidade
CREATE POLICY "Coordinators manage clients by unit"
ON public.clients
FOR ALL
TO authenticated
USING (
  user_has_role(ARRAY['coordinator_madre'::employee_role]) AND (unit = 'madre' OR unit IS NULL)
  OR user_has_role(ARRAY['coordinator_floresta'::employee_role]) AND unit = 'floresta'
  OR user_has_role(ARRAY['receptionist'::employee_role, 'staff'::employee_role])
)
WITH CHECK (
  user_has_role(ARRAY['coordinator_madre'::employee_role]) AND (unit = 'madre' OR unit IS NULL)
  OR user_has_role(ARRAY['coordinator_floresta'::employee_role]) AND unit = 'floresta'
  OR user_has_role(ARRAY['receptionist'::employee_role, 'staff'::employee_role])
  OR EXISTS (
    SELECT 1 FROM client_assignments ca 
    WHERE ca.client_id = clients.id 
    AND ca.employee_id = auth.uid() 
    AND ca.is_active = true
  )
);

-- Política para funcionários verem apenas clientes atribuídos
CREATE POLICY "Staff can view assigned clients"
ON public.clients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM client_assignments ca 
    WHERE ca.client_id = clients.id 
    AND ca.employee_id = auth.uid() 
    AND ca.is_active = true
  )
);

-- Atualizar política de schedules para diretores
DROP POLICY IF EXISTS "Directors can manage all schedules" ON public.schedules;

CREATE POLICY "Directors have full access to all schedules"
ON public.schedules
FOR ALL
TO authenticated
USING (director_has_god_mode())
WITH CHECK (director_has_god_mode());

-- Atualizar política de financial_records para diretores
DROP POLICY IF EXISTS "Manage financial records" ON public.financial_records;

CREATE POLICY "Directors have full access to financial records"
ON public.financial_records
FOR ALL
TO authenticated
USING (
  director_has_god_mode() OR 
  user_has_role(ARRAY['financeiro'::employee_role])
)
WITH CHECK (
  director_has_god_mode() OR 
  user_has_role(ARRAY['financeiro'::employee_role])
);

-- Atualizar política para que diretores vejam todos os attendance_reports
DROP POLICY IF EXISTS "Manage attendance reports" ON public.attendance_reports;

CREATE POLICY "Directors have full access to attendance reports"
ON public.attendance_reports
FOR ALL
TO authenticated
USING (
  director_has_god_mode() OR
  user_has_role(ARRAY['coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
)
WITH CHECK (
  director_has_god_mode() OR
  user_has_role(ARRAY['coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
);

-- Verificar se a função director_has_god_mode está funcionando corretamente
CREATE OR REPLACE FUNCTION public.director_has_god_mode()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = 'director'::employee_role
    AND is_active = true
  );
$$;