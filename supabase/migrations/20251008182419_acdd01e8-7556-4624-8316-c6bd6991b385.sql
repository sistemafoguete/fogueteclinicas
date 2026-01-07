-- Adicionar campo para funcionário responsável pela devolutiva
ALTER TABLE client_feedback_control 
ADD COLUMN assigned_to uuid REFERENCES auth.users(id);

-- Adicionar índice para melhor performance
CREATE INDEX idx_feedback_assigned_to ON client_feedback_control(assigned_to);

-- Atualizar política RLS para coordenador floresta gerenciar devolutivas
DROP POLICY IF EXISTS "Diretores e coordenadores floresta podem gerenciar devolutivas" ON client_feedback_control;

CREATE POLICY "Coordenadores floresta podem gerenciar devolutivas" 
ON client_feedback_control
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.employee_role = ANY(ARRAY['director'::employee_role, 'coordinator_floresta'::employee_role])
    AND profiles.is_active = true
  )
);

-- Política para funcionários designados visualizarem e anexarem laudos
CREATE POLICY "Funcionários designados podem anexar laudos" 
ON client_feedback_control
FOR UPDATE
USING (
  assigned_to = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_active = true
  )
)
WITH CHECK (
  assigned_to = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_active = true
  )
);

-- Política para funcionários designados visualizarem suas devolutivas
CREATE POLICY "Funcionários designados podem ver suas devolutivas" 
ON client_feedback_control
FOR SELECT
USING (
  assigned_to = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.employee_role = ANY(ARRAY['director'::employee_role, 'coordinator_floresta'::employee_role])
    AND profiles.is_active = true
  )
);