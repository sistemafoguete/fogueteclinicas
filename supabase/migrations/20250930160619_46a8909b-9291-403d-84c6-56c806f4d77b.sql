
-- Atualizar Christopher para coordenador da Madre
UPDATE public.profiles 
SET 
  employee_role = 'coordinator_madre'::employee_role,
  is_active = true
WHERE user_id = 'cd933617-bab8-42bd-abe4-bc44502d97b4';

-- Conceder permissões completas de coordenador
INSERT INTO public.user_specific_permissions (user_id, permission, granted)
VALUES 
  -- Dashboard e visualizações básicas
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'view_dashboard', true),
  
  -- Clientes (CRUD completo)
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'view_clients', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'create_clients', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'edit_clients', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'delete_clients', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'assign_clients', true),
  
  -- Agendamentos (CRUD completo)
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'view_schedules', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'create_schedules', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'edit_schedules', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'delete_schedules', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'confirm_appointments', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'cancel_appointments', true),
  
  -- Financeiro
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'view_financial', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'create_financial_records', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'edit_financial_records', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'delete_financial_records', true),
  
  -- Relatórios
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'view_reports', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'generate_reports', true),
  
  -- Estoque
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'view_stock', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'create_stock_items', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'edit_stock_items', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'delete_stock_items', true),
  
  -- Funcionários
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'view_employees', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'edit_employees', true),
  
  -- Prontuários médicos
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'view_medical_records', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'create_medical_records', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'edit_medical_records', true),
  
  -- Contratos
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'view_contracts', true),
  
  -- Mensagens
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'view_messages', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'create_messages', true),
  
  -- Arquivos
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'view_files', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'create_files', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'edit_files', true),
  
  -- Controle de qualidade
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'view_quality_control', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'create_quality_evaluations', true),
  
  -- Ponto eletrônico
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'view_timesheet', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'approve_timesheet', true),
  
  -- Alertas de reunião
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'view_meeting_alerts', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'create_meeting_alerts', true),
  
  -- Gerenciamento
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'manage_roles', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'view_audit_logs', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'export_data', true),
  ('cd933617-bab8-42bd-abe4-bc44502d97b4', 'import_data', true)
ON CONFLICT (user_id, permission) 
DO UPDATE SET granted = EXCLUDED.granted;
