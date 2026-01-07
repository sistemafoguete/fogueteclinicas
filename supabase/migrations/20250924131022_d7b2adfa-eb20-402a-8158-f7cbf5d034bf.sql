-- Atualizar política RLS para coordenadores terem acesso baseado na unidade
DROP POLICY IF EXISTS "All staff can view clients" ON public.clients;
DROP POLICY IF EXISTS "Coordinators can manage clients in their unit" ON public.clients;
DROP POLICY IF EXISTS "Staff can view assigned clients or all if coordinator/director" ON public.clients;

-- Nova política para visualizar clientes baseada na unidade do coordenador
CREATE POLICY "Staff can view clients based on unit access" 
ON public.clients 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND employee_role IS NOT NULL
  )
  AND (
    -- Diretores podem ver todos os clientes
    user_has_role(ARRAY['director'::employee_role])
    OR
    -- Coordenador Madre pode ver apenas clientes da unidade madre
    (user_has_role(ARRAY['coordinator_madre'::employee_role]) AND (clients.unit = 'madre' OR clients.unit IS NULL))
    OR
    -- Coordenador Floresta pode ver apenas clientes da unidade floresta  
    (user_has_role(ARRAY['coordinator_floresta'::employee_role]) AND clients.unit = 'floresta')
    OR
    -- Staff pode ver clientes vinculados a eles através de assignments
    (EXISTS (
      SELECT 1 FROM client_assignments ca
      WHERE ca.client_id = clients.id 
      AND ca.employee_id = auth.uid() 
      AND ca.is_active = true
    ))
    OR
    -- Recepcionistas podem ver todos os clientes (para agendamento)
    user_has_role(ARRAY['receptionist'::employee_role])
  )
);

-- Nova política para gerenciar clientes baseada na unidade
CREATE POLICY "Manage clients based on unit access" 
ON public.clients 
FOR ALL
USING (
  -- Diretores podem gerenciar todos os clientes
  user_has_role(ARRAY['director'::employee_role])
  OR
  -- Coordenador Madre pode gerenciar apenas clientes da unidade madre
  (user_has_role(ARRAY['coordinator_madre'::employee_role]) AND (clients.unit = 'madre' OR clients.unit IS NULL))
  OR
  -- Coordenador Floresta pode gerenciar apenas clientes da unidade floresta
  (user_has_role(ARRAY['coordinator_floresta'::employee_role]) AND clients.unit = 'floresta')
)
WITH CHECK (
  -- Diretores podem criar/atualizar todos os clientes
  user_has_role(ARRAY['director'::employee_role])
  OR
  -- Coordenador Madre pode criar/atualizar apenas clientes da unidade madre
  (user_has_role(ARRAY['coordinator_madre'::employee_role]) AND (clients.unit = 'madre' OR clients.unit IS NULL))
  OR
  -- Coordenador Floresta pode criar/atualizar apenas clientes da unidade floresta
  (user_has_role(ARRAY['coordinator_floresta'::employee_role]) AND clients.unit = 'floresta')
  OR
  -- Staff pode criar novos clientes (será restringido pela interface)
  (auth.uid() IS NOT NULL AND user_has_role(ARRAY['staff'::employee_role, 'receptionist'::employee_role]))
);