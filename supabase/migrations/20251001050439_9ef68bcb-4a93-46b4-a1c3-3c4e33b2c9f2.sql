-- Atualizar cargo do Christopher para coordenador do madre
UPDATE profiles 
SET employee_role = 'coordinator_madre'::employee_role
WHERE user_id = 'cd933617-bab8-42bd-abe4-bc44502d97b4' 
AND name = 'Christopher Menezes Coelho';