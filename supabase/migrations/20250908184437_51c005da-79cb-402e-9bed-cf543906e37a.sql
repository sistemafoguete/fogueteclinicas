-- Atualizar o perfil do usuário atual para diretor
UPDATE profiles 
SET employee_role = 'director'::employee_role 
WHERE user_id = auth.uid();