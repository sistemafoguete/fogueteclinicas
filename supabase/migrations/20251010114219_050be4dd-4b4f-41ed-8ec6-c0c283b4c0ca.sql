-- Atualizar política RLS para acesso restrito por vínculo
-- Drop da política antiga
DROP POLICY IF EXISTS "View clients policy" ON public.clients;

-- Nova política que verifica vínculos através de client_assignments
CREATE POLICY "View clients policy" 
ON public.clients 
FOR SELECT 
USING (
  -- Diretor: Acesso total (god mode)
  (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = 'director'::employee_role 
    AND is_active = true
  ))
  OR
  -- Coordenador Madre: Acesso à unidade madre
  ((unit = 'madre'::text) AND (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = 'coordinator_madre'::employee_role 
    AND is_active = true
  )))
  OR
  -- Coordenador Floresta: Acesso à unidade floresta
  ((unit = 'floresta'::text) AND (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = 'coordinator_floresta'::employee_role 
    AND is_active = true
  )))
  OR
  -- Recepcionista: Acesso a todos os clientes (para agendamento)
  (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = 'receptionist'::employee_role 
    AND is_active = true
  ))
  OR
  -- Funcionários vinculados através de client_assignments
  (EXISTS (
    SELECT 1 FROM public.client_assignments ca
    WHERE ca.client_id = clients.id 
    AND ca.employee_id = auth.uid() 
    AND ca.is_active = true
  ))
  OR
  -- Funcionários com feedback atribuído
  (EXISTS (
    SELECT 1 FROM public.client_feedback_control cfc
    WHERE cfc.client_id = clients.id 
    AND cfc.assigned_to = auth.uid()
  ))
);

-- Comentário explicativo
COMMENT ON POLICY "View clients policy" ON public.clients IS 
'Política de acesso restrito: Diretores veem todos, coordenadores veem sua unidade, recepcionistas veem todos, funcionários veem apenas pacientes vinculados via client_assignments ou feedback_control';