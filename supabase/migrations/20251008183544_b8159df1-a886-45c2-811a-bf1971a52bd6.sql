-- Criar bucket para laudos se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('laudos', 'laudos', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas para o bucket de laudos
-- Coordenadores e funcionários atribuídos podem fazer upload
CREATE POLICY "Coordenadores e funcionários podem fazer upload de laudos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'laudos'
  AND (
    -- Coordenadores podem fazer upload
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.employee_role = ANY(ARRAY['director'::employee_role, 'coordinator_floresta'::employee_role])
      AND profiles.is_active = true
    )
    OR
    -- Funcionários atribuídos podem fazer upload
    EXISTS (
      SELECT 1 FROM client_feedback_control
      WHERE client_feedback_control.assigned_to = auth.uid()
      AND client_feedback_control.client_id::text = (storage.foldername(name))[1]
    )
  )
);

-- Coordenadores e funcionários atribuídos podem visualizar laudos
CREATE POLICY "Coordenadores e funcionários podem visualizar laudos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'laudos'
  AND (
    -- Coordenadores podem visualizar
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.employee_role = ANY(ARRAY['director'::employee_role, 'coordinator_floresta'::employee_role])
      AND profiles.is_active = true
    )
    OR
    -- Funcionários atribuídos podem visualizar
    EXISTS (
      SELECT 1 FROM client_feedback_control
      WHERE client_feedback_control.assigned_to = auth.uid()
      AND client_feedback_control.client_id::text = (storage.foldername(name))[1]
    )
  )
);

-- Apenas coordenadores podem excluir laudos
CREATE POLICY "Apenas coordenadores podem excluir laudos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'laudos'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.employee_role = ANY(ARRAY['director'::employee_role, 'coordinator_floresta'::employee_role])
    AND profiles.is_active = true
  )
);