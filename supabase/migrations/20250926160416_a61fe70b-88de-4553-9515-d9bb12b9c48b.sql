-- Remover a política problemática que pode causar recursão
DROP POLICY IF EXISTS "Receptionists can view all active professionals" ON profiles;

-- Criar função segura para verificar se o usuário atual é recepcionista
CREATE OR REPLACE FUNCTION is_receptionist()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = 'receptionist'::employee_role
    AND is_active = true
  );
$$;

-- Política para permitir que recepcionistas vejam todos os profissionais ativos
CREATE POLICY "Receptionists can view all professionals" ON profiles
FOR SELECT USING (
  (auth.uid() IS NOT NULL) AND 
  (
    -- O próprio usuário pode ver seu perfil
    auth.uid() = user_id OR
    -- Recepcionistas podem ver todos os profissionais ativos
    (is_receptionist() AND is_active = true AND employee_role IS NOT NULL) OR
    -- Diretores e coordenadores mantêm acesso total
    user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
  )
);