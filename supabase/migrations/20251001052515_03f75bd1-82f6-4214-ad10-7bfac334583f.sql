-- Atualizar Christopher definitivamente para coordinator_madre
UPDATE profiles 
SET 
  employee_role = 'coordinator_madre'::employee_role,
  updated_at = NOW()
WHERE user_id = 'cd933617-bab8-42bd-abe4-bc44502d97b4';

-- Verificar se há alguma sobrescrita de permissões específicas do usuário que possa estar interferindo
DELETE FROM user_specific_permissions 
WHERE user_id = 'cd933617-bab8-42bd-abe4-bc44502d97b4';

-- Garantir que não há atribuições de cargo conflitantes
DELETE FROM user_job_assignments 
WHERE user_id = 'cd933617-bab8-42bd-abe4-bc44502d97b4';