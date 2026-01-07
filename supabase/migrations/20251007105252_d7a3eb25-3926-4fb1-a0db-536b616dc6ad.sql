-- Inserir permissões padrão para Coordenador(a) Madre
INSERT INTO role_permissions (employee_role, permission, granted) VALUES
('coordinator_madre', 'view_clients', true),
('coordinator_madre', 'create_clients', true),
('coordinator_madre', 'edit_clients', true),
('coordinator_madre', 'view_employees', true),
('coordinator_madre', 'view_schedules', true),
('coordinator_madre', 'create_schedules', true),
('coordinator_madre', 'edit_schedules', true),
('coordinator_madre', 'delete_schedules', true),
('coordinator_madre', 'view_reports', true),
('coordinator_madre', 'create_reports', true),
('coordinator_madre', 'view_documents', true),
('coordinator_madre', 'create_documents', true),
('coordinator_madre', 'edit_documents', true)
ON CONFLICT (employee_role, permission) DO NOTHING;

-- Inserir permissões padrão para Coordenador(a) Floresta
INSERT INTO role_permissions (employee_role, permission, granted) VALUES
('coordinator_floresta', 'view_clients', true),
('coordinator_floresta', 'create_clients', true),
('coordinator_floresta', 'edit_clients', true),
('coordinator_floresta', 'view_employees', true),
('coordinator_floresta', 'view_schedules', true),
('coordinator_floresta', 'create_schedules', true),
('coordinator_floresta', 'edit_schedules', true),
('coordinator_floresta', 'delete_schedules', true),
('coordinator_floresta', 'view_reports', true),
('coordinator_floresta', 'create_reports', true),
('coordinator_floresta', 'view_documents', true),
('coordinator_floresta', 'create_documents', true),
('coordinator_floresta', 'edit_documents', true)
ON CONFLICT (employee_role, permission) DO NOTHING;

-- Inserir permissões padrão para Diretor(a) - acesso total
INSERT INTO role_permissions (employee_role, permission, granted)
SELECT 'director'::employee_role, unnest(enum_range(NULL::permission_type)), true
ON CONFLICT (employee_role, permission) DO NOTHING;

-- Inserir permissões padrão para Financeiro
INSERT INTO role_permissions (employee_role, permission, granted) VALUES
('financeiro', 'view_financial', true),
('financeiro', 'create_financial', true),
('financeiro', 'edit_financial', true),
('financeiro', 'delete_financial', true),
('financeiro', 'view_stock', true),
('financeiro', 'create_stock', true),
('financeiro', 'edit_stock', true),
('financeiro', 'view_reports', true),
('financeiro', 'create_reports', true)
ON CONFLICT (employee_role, permission) DO NOTHING;

-- Inserir permissões padrão para Recepcionista
INSERT INTO role_permissions (employee_role, permission, granted) VALUES
('receptionist', 'view_clients', true),
('receptionist', 'create_clients', true),
('receptionist', 'edit_clients', true),
('receptionist', 'view_schedules', true),
('receptionist', 'create_schedules', true),
('receptionist', 'edit_schedules', true)
ON CONFLICT (employee_role, permission) DO NOTHING;