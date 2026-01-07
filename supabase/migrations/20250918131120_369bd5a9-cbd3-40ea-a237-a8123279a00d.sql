-- Permitir que usuários editem seus próprios agendamentos
CREATE POLICY "Users can update their own schedules"
ON public.schedules
FOR UPDATE
USING (
  auth.uid() = employee_id OR 
  user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
)
WITH CHECK (
  auth.uid() = employee_id OR 
  user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
);

-- Permitir que usuários excluam seus próprios agendamentos
CREATE POLICY "Users can delete their own schedules" 
ON public.schedules
FOR DELETE
USING (
  auth.uid() = employee_id OR 
  user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
);