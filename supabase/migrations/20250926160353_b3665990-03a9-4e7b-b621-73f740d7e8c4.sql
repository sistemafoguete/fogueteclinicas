-- Política para permitir que recepcionistas vejam todos os profissionais
CREATE POLICY "Receptionists can view all active professionals" ON profiles
FOR SELECT USING (
  (auth.uid() IS NOT NULL) AND 
  (
    -- O próprio usuário pode ver seu perfil
    auth.uid() = user_id OR
    -- Recepcionistas podem ver todos os profissionais ativos
    (
      EXISTS (
        SELECT 1 FROM profiles current_user_profile 
        WHERE current_user_profile.user_id = auth.uid() 
        AND current_user_profile.employee_role = 'receptionist'
        AND current_user_profile.is_active = true
      ) AND is_active = true AND employee_role IS NOT NULL
    ) OR
    -- Diretores e coordenadores mantêm acesso total
    user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
  )
);