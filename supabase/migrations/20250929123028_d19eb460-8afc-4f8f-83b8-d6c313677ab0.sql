-- Remover todas as políticas conflitantes e recriar corretamente

-- Remover política conflitante
DROP POLICY IF EXISTS "Coordinators manage clients by unit" ON public.clients;

-- Política específica para coordenadores baseada na unidade
CREATE POLICY "Coordinators access by unit"
ON public.clients
FOR ALL
TO authenticated
USING (
  user_has_role(ARRAY['coordinator_madre'::employee_role]) AND (unit = 'madre' OR unit IS NULL)
  OR user_has_role(ARRAY['coordinator_floresta'::employee_role]) AND unit = 'floresta'
  OR user_has_role(ARRAY['receptionist'::employee_role])
)
WITH CHECK (
  user_has_role(ARRAY['coordinator_madre'::employee_role]) AND (unit = 'madre' OR unit IS NULL)
  OR user_has_role(ARRAY['coordinator_floresta'::employee_role]) AND unit = 'floresta'
  OR user_has_role(ARRAY['receptionist'::employee_role])
  OR EXISTS (
    SELECT 1 FROM client_assignments ca 
    WHERE ca.client_id = clients.id 
    AND ca.employee_id = auth.uid() 
    AND ca.is_active = true
  )
);