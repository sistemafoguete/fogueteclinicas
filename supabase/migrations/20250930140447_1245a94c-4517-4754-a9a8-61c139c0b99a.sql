-- Atualizar políticas de stock_items para incluir coordinator_floresta

-- Drop políticas existentes
DROP POLICY IF EXISTS "Directors can manage stock items" ON stock_items;
DROP POLICY IF EXISTS "Staff can view stock items" ON stock_items;

-- Criar novas políticas com permissão para coordinator_floresta
CREATE POLICY "Directors and coordinators can manage stock items"
ON stock_items
FOR ALL
TO authenticated
USING (
  user_has_role(ARRAY['director'::employee_role, 'financeiro'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
)
WITH CHECK (
  user_has_role(ARRAY['director'::employee_role, 'financeiro'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
);

CREATE POLICY "All staff can view stock items"
ON stock_items
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Atualizar políticas de stock_movements para incluir coordinator_floresta

-- Drop políticas existentes
DROP POLICY IF EXISTS "Directors can manage stock movements" ON stock_movements;
DROP POLICY IF EXISTS "Staff can view stock movements" ON stock_movements;
DROP POLICY IF EXISTS "System can create stock movements" ON stock_movements;

-- Criar novas políticas com permissão para coordinator_floresta
CREATE POLICY "Directors and coordinators can manage stock movements"
ON stock_movements
FOR ALL
TO authenticated
USING (
  user_has_role(ARRAY['director'::employee_role, 'financeiro'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
)
WITH CHECK (
  user_has_role(ARRAY['director'::employee_role, 'financeiro'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
);

CREATE POLICY "All staff can view stock movements"
ON stock_movements
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Política para permitir inserção de movimentações por qualquer usuário autenticado (para logs automáticos)
CREATE POLICY "Authenticated users can create stock movements"
ON stock_movements
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);