-- Atualizar política de acesso financeiro para apenas diretores
DROP POLICY IF EXISTS "Financial access policy" ON financial_records;

CREATE POLICY "Financial access policy" 
ON financial_records 
FOR ALL 
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.employee_role = 'director'
      AND profiles.is_active = true
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.employee_role = 'director'
      AND profiles.is_active = true
  )
);

-- Adicionar comentário explicativo
COMMENT ON POLICY "Financial access policy" ON financial_records IS 
'Apenas diretores têm acesso completo aos registros financeiros';