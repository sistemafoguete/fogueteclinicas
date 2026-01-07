-- Adicionar política para permitir que coordenadores e funcionários financeiros criem itens no estoque
CREATE POLICY "Coordinators and finance can create stock items" 
ON public.stock_items 
FOR INSERT 
WITH CHECK (user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role, 'financeiro'::employee_role]));