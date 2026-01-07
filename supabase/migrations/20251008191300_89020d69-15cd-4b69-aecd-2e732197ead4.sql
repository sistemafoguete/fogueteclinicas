-- Remover policies antigas que verificavam client_assignments
DROP POLICY IF EXISTS "Funcionários veem devolutivas de clientes atribuídos" ON public.client_feedback_control;
DROP POLICY IF EXISTS "Funcionários podem anexar laudos em devolutivas atribuídas" ON public.client_feedback_control;

-- Policy para funcionários visualizarem devolutivas atribuídas a eles
CREATE POLICY "Funcionários podem ver suas devolutivas atribuídas" 
ON public.client_feedback_control 
FOR SELECT 
USING (
  -- Gestores veem tudo
  (EXISTS ( 
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() 
    AND profiles.employee_role = ANY (ARRAY['director'::employee_role, 'coordinator_floresta'::employee_role])
    AND profiles.is_active = true
  ))
  OR
  -- Funcionários veem apenas devolutivas atribuídas a eles
  (assigned_to = auth.uid() AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.unit = 'floresta'::text
    AND profiles.is_active = true
  ))
);

-- Policy para funcionários atualizarem (anexar laudos) devolutivas atribuídas a eles
CREATE POLICY "Funcionários podem atualizar suas devolutivas" 
ON public.client_feedback_control 
FOR UPDATE 
USING (
  -- Gestores podem atualizar tudo
  (EXISTS ( 
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() 
    AND profiles.employee_role = ANY (ARRAY['director'::employee_role, 'coordinator_floresta'::employee_role])
    AND profiles.is_active = true
  ))
  OR
  -- Funcionários podem atualizar apenas suas devolutivas atribuídas
  (assigned_to = auth.uid() AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.unit = 'floresta'::text
    AND profiles.is_active = true
  ))
);