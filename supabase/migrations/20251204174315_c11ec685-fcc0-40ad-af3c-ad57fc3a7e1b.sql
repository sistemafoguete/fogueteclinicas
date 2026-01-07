-- Adicionar permissão delete_schedules para todos os coordenadores
INSERT INTO public.role_permissions (employee_role, permission, granted)
VALUES 
  ('coordinator_madre', 'delete_schedules', true),
  ('coordinator_floresta', 'delete_schedules', true),
  ('coordinator_atendimento_floresta', 'delete_schedules', true)
ON CONFLICT (employee_role, permission) 
DO UPDATE SET granted = true, updated_at = NOW();