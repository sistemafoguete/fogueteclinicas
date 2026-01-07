-- Remover políticas antigas conflitantes da tabela schedules
DROP POLICY IF EXISTS "Staff can view and create schedules" ON public.schedules;
DROP POLICY IF EXISTS "Staff can insert schedules" ON public.schedules;
DROP POLICY IF EXISTS "Directors have full schedule access" ON public.schedules;
DROP POLICY IF EXISTS "Director god mode - schedules" ON public.schedules;
DROP POLICY IF EXISTS "Coordinators can view all schedules" ON public.schedules;
DROP POLICY IF EXISTS "Professionals can view their schedules" ON public.schedules;
DROP POLICY IF EXISTS "Coordinators can manage schedules" ON public.schedules;
DROP POLICY IF EXISTS "View schedules policy" ON public.schedules;
DROP POLICY IF EXISTS "Create schedules policy" ON public.schedules;
DROP POLICY IF EXISTS "Update schedules policy" ON public.schedules;

-- Política de visualização (SELECT)
CREATE POLICY "View schedules with unit access control"
ON public.schedules
FOR SELECT
TO authenticated
USING (
  -- Diretores veem tudo
  director_has_god_mode()
  OR
  -- Coordenadores veem apenas sua unidade
  (
    unit = 'madre' AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND employee_role = 'coordinator_madre'::employee_role
      AND is_active = true
    )
  )
  OR
  (
    unit = 'floresta' AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND employee_role = 'coordinator_floresta'::employee_role
      AND is_active = true
    )
  )
  OR
  -- Recepcionistas veem tudo (para gerenciar chegadas)
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = 'receptionist'::employee_role
    AND is_active = true
  )
  OR
  -- Profissionais veem apenas seus agendamentos
  employee_id = auth.uid()
);

-- Política de criação (INSERT)
CREATE POLICY "Create schedules with unit access control"
ON public.schedules
FOR INSERT
TO authenticated
WITH CHECK (
  -- Diretores podem criar em qualquer unidade
  director_has_god_mode()
  OR
  -- Coordenadores podem criar apenas em sua unidade
  (
    unit = 'madre' AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND employee_role = 'coordinator_madre'::employee_role
      AND is_active = true
    )
  )
  OR
  (
    unit = 'floresta' AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND employee_role = 'coordinator_floresta'::employee_role
      AND is_active = true
    )
  )
  OR
  -- Recepcionistas podem criar em qualquer unidade
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = 'receptionist'::employee_role
    AND is_active = true
  )
);

-- Política de atualização (UPDATE)
CREATE POLICY "Update schedules with unit access control"
ON public.schedules
FOR UPDATE
TO authenticated
USING (
  -- Diretores podem atualizar tudo
  director_has_god_mode()
  OR
  -- Coordenadores podem atualizar apenas sua unidade
  (
    unit = 'madre' AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND employee_role = 'coordinator_madre'::employee_role
      AND is_active = true
    )
  )
  OR
  (
    unit = 'floresta' AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND employee_role = 'coordinator_floresta'::employee_role
      AND is_active = true
    )
  )
  OR
  -- Recepcionistas podem atualizar (para marcar chegadas)
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = 'receptionist'::employee_role
    AND is_active = true
  )
  OR
  -- Profissionais podem atualizar seus agendamentos
  employee_id = auth.uid()
);