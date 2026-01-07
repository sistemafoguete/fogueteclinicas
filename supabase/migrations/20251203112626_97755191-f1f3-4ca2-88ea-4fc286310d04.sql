-- Adicionar permissões padrão para o novo cargo coordinator_atendimento_floresta
-- Copiando as mesmas permissões do coordinator_floresta
INSERT INTO role_permissions (employee_role, permission, granted)
SELECT 
  'coordinator_atendimento_floresta'::employee_role,
  permission,
  granted
FROM role_permissions 
WHERE employee_role = 'coordinator_floresta'
ON CONFLICT (employee_role, permission) DO NOTHING;