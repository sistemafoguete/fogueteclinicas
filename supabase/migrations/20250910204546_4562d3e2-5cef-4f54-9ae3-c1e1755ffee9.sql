-- Configurar permissões padrão para roles
INSERT INTO role_permissions (employee_role, permission, granted) VALUES
-- Director - acesso total
('director', 'dashboard_view', true),
('director', 'patients_view_all', true),
('director', 'patients_create', true),
('director', 'patients_edit', true),
('director', 'patients_delete', true),
('director', 'patients_view_sensitive', true),
('director', 'appointments_view_all', true),
('director', 'appointments_create', true),
('director', 'appointments_edit', true),
('director', 'appointments_delete', true),
('director', 'employees_view', true),
('director', 'employees_create', true),
('director', 'employees_edit', true),
('director', 'employees_delete', true),
('director', 'finance_view', true),
('director', 'finance_create', true),
('director', 'finance_edit', true),
('director', 'finance_delete', true),
('director', 'finance_export', true),
('director', 'stock_view', true),
('director', 'stock_create', true),
('director', 'stock_edit', true),
('director', 'reports_view', true),
('director', 'reports_generate', true),
('director', 'reports_export', true),
('director', 'settings_view', true),
('director', 'settings_edit', true),
('director', 'audit_view', true),
('director', 'system_admin', true),

-- Coordinator Madre
('coordinator_madre', 'dashboard_view', true),
('coordinator_madre', 'patients_view_assigned', true),
('coordinator_madre', 'patients_create', true),
('coordinator_madre', 'patients_edit', true),
('coordinator_madre', 'appointments_view_all', true),
('coordinator_madre', 'appointments_create', true),
('coordinator_madre', 'appointments_edit', true),
('coordinator_madre', 'employees_view', true),
('coordinator_madre', 'employees_edit', true),
('coordinator_madre', 'stock_view', true),
('coordinator_madre', 'reports_view', true),
('coordinator_madre', 'reports_generate', true),

-- Staff
('staff', 'dashboard_view', true),
('staff', 'patients_view_assigned', true),
('staff', 'patients_create', true),
('staff', 'patients_edit', true),
('staff', 'appointments_view_assigned', true),
('staff', 'appointments_create', true),
('staff', 'appointments_edit', true),
('staff', 'stock_view', true),
('staff', 'reports_view', true),

-- Financeiro
('financeiro', 'dashboard_view', true),
('financeiro', 'patients_view_lite', true),
('financeiro', 'finance_view', true),
('financeiro', 'finance_create', true),
('financeiro', 'finance_edit', true),
('financeiro', 'finance_export', true),
('financeiro', 'reports_view', true),
('financeiro', 'reports_generate', true),

-- Receptionist
('receptionist', 'patients_view_assigned', true),
('receptionist', 'patients_create', true),
('receptionist', 'patients_edit_basic', true),
('receptionist', 'appointments_view_all', true),
('receptionist', 'appointments_create', true),
('receptionist', 'appointments_edit', true),
('receptionist', 'appointments_mark_attendance', true)

ON CONFLICT (employee_role, permission) DO UPDATE SET granted = EXCLUDED.granted;

-- Inserir algumas configurações básicas do sistema
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('system_name', 'Sistema Fundação Dom Bosco', 'string', 'Nome do sistema', true),
('enable_audit_logs', 'true', 'boolean', 'Habilitar logs de auditoria', false),
('max_file_upload_size', '10485760', 'number', 'Tamanho máximo de upload em bytes (10MB)', false),
('session_timeout_minutes', '480', 'number', 'Tempo limite da sessão em minutos (8 horas)', false)
ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  updated_at = now();

-- Habilitar realtime para tabelas importantes
ALTER TABLE public.internal_messages REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;
ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;