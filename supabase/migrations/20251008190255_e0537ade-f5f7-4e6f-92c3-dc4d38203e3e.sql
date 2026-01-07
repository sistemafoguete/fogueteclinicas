-- Remover políticas antigas de client_feedback_control
DROP POLICY IF EXISTS "Coordenadores floresta podem gerenciar devolutivas" ON public.client_feedback_control;
DROP POLICY IF EXISTS "Funcionários designados podem anexar laudos" ON public.client_feedback_control;
DROP POLICY IF EXISTS "Funcionários designados podem ver suas devolutivas" ON public.client_feedback_control;

-- Nova política: Diretores e coordenadores floresta podem ver todas as devolutivas
CREATE POLICY "Gestores podem ver todas as devolutivas"
ON public.client_feedback_control
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND employee_role IN ('director', 'coordinator_floresta')
    AND is_active = true
  )
);

-- Nova política: Funcionários da floresta podem ver devolutivas de clientes atribuídos a eles
CREATE POLICY "Funcionários veem devolutivas de clientes atribuídos"
ON public.client_feedback_control
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    INNER JOIN public.client_assignments ca ON ca.employee_id = p.user_id
    WHERE p.user_id = auth.uid()
    AND p.unit = 'floresta'
    AND p.is_active = true
    AND ca.client_id = client_feedback_control.client_id
    AND ca.is_active = true
  )
);

-- Nova política: Apenas gestores podem inserir novas devolutivas
CREATE POLICY "Gestores podem criar devolutivas"
ON public.client_feedback_control
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND employee_role IN ('director', 'coordinator_floresta')
    AND is_active = true
  )
);

-- Nova política: Gestores podem atualizar todas as devolutivas
CREATE POLICY "Gestores podem atualizar devolutivas"
ON public.client_feedback_control
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND employee_role IN ('director', 'coordinator_floresta')
    AND is_active = true
  )
);

-- Nova política: Funcionários podem atualizar devolutivas de clientes atribuídos (anexar laudos)
CREATE POLICY "Funcionários podem anexar laudos em devolutivas atribuídas"
ON public.client_feedback_control
FOR UPDATE
USING (
  assigned_to = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    INNER JOIN public.client_assignments ca ON ca.employee_id = p.user_id
    WHERE p.user_id = auth.uid()
    AND p.unit = 'floresta'
    AND p.is_active = true
    AND ca.client_id = client_feedback_control.client_id
    AND ca.is_active = true
  )
);

-- Nova política: Apenas gestores podem deletar devolutivas
CREATE POLICY "Gestores podem deletar devolutivas"
ON public.client_feedback_control
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND employee_role IN ('director', 'coordinator_floresta')
    AND is_active = true
  )
);