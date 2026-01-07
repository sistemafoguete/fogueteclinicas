-- Remover política RLS antiga muito restritiva
DROP POLICY IF EXISTS "Users can view alerts for them" ON meeting_alerts;

-- Criar nova política mais permissiva que permite:
-- 1. Diretores e coordenadores: veem tudo
-- 2. Funcionários ativos: veem reuniões com inscrições abertas (is_open_enrollment = true)
-- 3. Participantes: veem suas reuniões específicas
CREATE POLICY "Staff can view meeting alerts with open enrollment"
ON meeting_alerts
FOR SELECT
TO authenticated
USING (
  -- Diretores e coordenadores veem tudo
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND employee_role IN ('director', 'coordinator_madre', 'coordinator_floresta')
    AND is_active = true
  ))
  OR
  -- Funcionários ativos veem reuniões com inscrições abertas
  (is_open_enrollment = true AND is_active = true AND EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND is_active = true
  ))
  OR
  -- Participantes veem suas reuniões
  (auth.uid() = ANY(participants))
);