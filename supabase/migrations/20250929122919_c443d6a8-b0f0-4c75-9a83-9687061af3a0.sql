-- Limpar políticas redundantes e manter apenas as necessárias para diretores

-- Remover política duplicada
DROP POLICY IF EXISTS "Directors have full access to all clients" ON public.clients;

-- A política "Director god mode - clients" já existe e é suficiente para dar acesso total aos diretores

-- Verificar se existe política similar para outras tabelas importantes
-- Vamos garantir que diretores tenham acesso a schedules de ambas as unidades

-- Verificar schedules
DROP POLICY IF EXISTS "Directors can manage all schedules" ON public.schedules;

CREATE POLICY "Directors have full schedule access"
ON public.schedules
FOR ALL
TO authenticated
USING (director_has_god_mode())
WITH CHECK (director_has_god_mode());

-- Garantir que diretores vejam pagamentos de ambas as unidades
DROP POLICY IF EXISTS "Coordenadores e diretores podem gerenciar pagamentos da madre" ON public.client_payments;

CREATE POLICY "Directors have full access to all payments"
ON public.client_payments
FOR ALL
TO authenticated
USING (director_has_god_mode())
WITH CHECK (director_has_god_mode());

CREATE POLICY "Coordinators can manage unit payments"
ON public.client_payments
FOR ALL
TO authenticated
USING (
  (unit = 'madre' AND user_has_role(ARRAY['coordinator_madre'::employee_role])) OR
  (unit = 'floresta' AND user_has_role(ARRAY['coordinator_floresta'::employee_role]))
)
WITH CHECK (
  (unit = 'madre' AND user_has_role(ARRAY['coordinator_madre'::employee_role])) OR
  (unit = 'floresta' AND user_has_role(ARRAY['coordinator_floresta'::employee_role]))
);