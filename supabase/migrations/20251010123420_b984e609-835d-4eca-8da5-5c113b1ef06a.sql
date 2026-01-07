-- Atualizar política de visualização de clientes para incluir pacientes com agendamentos
DROP POLICY IF EXISTS "View clients policy" ON public.clients;

CREATE POLICY "View clients policy" 
ON public.clients 
FOR SELECT 
USING (
  -- Diretores veem tudo
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = 'director'::employee_role 
    AND is_active = true
  ))
  OR 
  -- Coordenadores veem pacientes da sua unidade
  ((unit = 'madre') AND (EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = 'coordinator_madre'::employee_role 
    AND is_active = true
  )))
  OR 
  ((unit = 'floresta') AND (EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = 'coordinator_floresta'::employee_role 
    AND is_active = true
  )))
  OR 
  -- Recepcionistas veem todos
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = 'receptionist'::employee_role 
    AND is_active = true
  ))
  OR 
  -- Staff vê pacientes atribuídos
  (EXISTS (
    SELECT 1 FROM client_assignments ca 
    WHERE ca.client_id = clients.id 
    AND ca.employee_id = auth.uid() 
    AND ca.is_active = true
  ))
  OR 
  -- Staff vê pacientes com devolutivas atribuídas
  (EXISTS (
    SELECT 1 FROM client_feedback_control cfc 
    WHERE cfc.client_id = clients.id 
    AND cfc.assigned_to = auth.uid()
  ))
  OR
  -- Staff vê pacientes que têm agendamentos com ele
  (EXISTS (
    SELECT 1 FROM schedules s
    WHERE s.client_id = clients.id
    AND s.employee_id = auth.uid()
  ))
);