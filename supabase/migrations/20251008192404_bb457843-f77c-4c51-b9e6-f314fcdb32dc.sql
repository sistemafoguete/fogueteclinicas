-- Remover políticas antigas restritivas de client_feedback_control
DROP POLICY IF EXISTS "Gestores podem ver todas as devolutivas" ON public.client_feedback_control;
DROP POLICY IF EXISTS "Gestores podem criar devolutivas" ON public.client_feedback_control;
DROP POLICY IF EXISTS "Gestores podem atualizar devolutivas" ON public.client_feedback_control;
DROP POLICY IF EXISTS "Gestores podem deletar devolutivas" ON public.client_feedback_control;
DROP POLICY IF EXISTS "Funcionários podem ver suas devolutivas atribuídas" ON public.client_feedback_control;
DROP POLICY IF EXISTS "Funcionários podem atualizar suas devolutivas" ON public.client_feedback_control;

-- Nova política SELECT: todos veem suas devolutivas atribuídas, coordenadores/diretores veem tudo
CREATE POLICY "Todos podem ver devolutivas atribuídas ou gerenciar tudo"
ON public.client_feedback_control
FOR SELECT
USING (
  -- Coordenadores e diretores veem TODAS
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND employee_role IN ('director', 'coordinator_floresta')
    AND is_active = true
  ))
  OR
  -- Funcionários atribuídos veem apenas as suas
  (assigned_to = auth.uid() AND EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND is_active = true
  ))
);

-- Política INSERT: apenas coordenadores e diretores
CREATE POLICY "Coordenadores podem criar devolutivas"
ON public.client_feedback_control
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND employee_role IN ('director', 'coordinator_floresta')
    AND is_active = true
  )
);

-- Política UPDATE: coordenadores atualizam tudo, funcionários atribuídos atualizam as suas
CREATE POLICY "Coordenadores e atribuídos podem atualizar devolutivas"
ON public.client_feedback_control
FOR UPDATE
USING (
  -- Coordenadores e diretores atualizam TODAS
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND employee_role IN ('director', 'coordinator_floresta')
    AND is_active = true
  ))
  OR
  -- Funcionários atribuídos atualizam apenas as suas
  (assigned_to = auth.uid() AND EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND is_active = true
  ))
);

-- Política DELETE: apenas coordenadores e diretores
CREATE POLICY "Coordenadores podem deletar devolutivas"
ON public.client_feedback_control
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND employee_role IN ('director', 'coordinator_floresta')
    AND is_active = true
  )
);

-- Criar bucket para laudos de feedback se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-feedback-reports', 'client-feedback-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para o bucket client-feedback-reports
-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Funcionários podem visualizar laudos atribuídos" ON storage.objects;
DROP POLICY IF EXISTS "Funcionários podem fazer upload de laudos" ON storage.objects;
DROP POLICY IF EXISTS "Coordenadores podem visualizar todos os laudos" ON storage.objects;

-- Coordenadores e diretores podem ver TODOS os laudos
CREATE POLICY "Coordenadores podem visualizar todos os laudos de feedback"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'client-feedback-reports'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND employee_role IN ('director', 'coordinator_floresta')
    AND is_active = true
  )
);

-- Funcionários atribuídos podem ver apenas laudos das suas devolutivas
CREATE POLICY "Funcionários podem visualizar laudos das suas devolutivas"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'client-feedback-reports'
  AND EXISTS (
    SELECT 1 FROM client_feedback_control cfc
    WHERE cfc.assigned_to = auth.uid()
    AND storage.objects.name LIKE '%' || cfc.id::text || '%'
  )
);

-- Funcionários atribuídos podem fazer upload de laudos para suas devolutivas
CREATE POLICY "Funcionários podem fazer upload de laudos para suas devolutivas"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'client-feedback-reports'
  AND (
    -- Coordenadores podem fazer upload de qualquer laudo
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND employee_role IN ('director', 'coordinator_floresta')
      AND is_active = true
    )
    OR
    -- Funcionários atribuídos podem fazer upload para suas devolutivas
    EXISTS (
      SELECT 1 FROM client_feedback_control cfc
      WHERE cfc.assigned_to = auth.uid()
      AND storage.objects.name LIKE '%' || cfc.id::text || '%'
    )
  )
);

-- Permitir atualização (substituição) de laudos
CREATE POLICY "Funcionários podem atualizar laudos das suas devolutivas"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'client-feedback-reports'
  AND (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND employee_role IN ('director', 'coordinator_floresta')
      AND is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM client_feedback_control cfc
      WHERE cfc.assigned_to = auth.uid()
      AND storage.objects.name LIKE '%' || cfc.id::text || '%'
    )
  )
);