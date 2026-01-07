-- Garantir que coordenadores possam adicionar itens ao estoque
-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Coordinators can manage stock items" ON public.stock_items;
DROP POLICY IF EXISTS "Coordinators can insert stock items" ON public.stock_items;

-- Criar política para coordenadores adicionarem itens
CREATE POLICY "Coordinators can insert stock items"
ON public.stock_items
FOR INSERT
TO authenticated
WITH CHECK (
  user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role, 'financeiro'::employee_role])
);

-- Criar política para coordenadores gerenciarem (atualizar/deletar) itens
CREATE POLICY "Coordinators can manage stock items"
ON public.stock_items
FOR ALL
TO authenticated
USING (
  user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role, 'financeiro'::employee_role])
)
WITH CHECK (
  user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role, 'financeiro'::employee_role])
);