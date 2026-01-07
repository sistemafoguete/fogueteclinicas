-- Adicionar política RLS para coordinator_floresta poder gerenciar templates de contrato
CREATE POLICY "coordinator_floresta can manage contract templates" 
ON public.contract_templates 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.employee_role = 'coordinator_floresta'::employee_role
    AND profiles.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.employee_role = 'coordinator_floresta'::employee_role
    AND profiles.is_active = true
  )
);