-- Criar tabelas para sistema de cargos e permissões personalizados

-- Criar enum para tipos de permissões disponíveis
CREATE TYPE permission_action AS ENUM (
  -- Permissões de leitura
  'view_dashboard',
  'view_clients',
  'view_schedules', 
  'view_financial',
  'view_reports',
  'view_stock',
  'view_employees',
  'view_medical_records',
  'view_contracts',
  'view_messages',
  'view_files',
  'view_quality_control',
  'view_timesheet',
  'view_meeting_alerts',
  
  -- Permissões de criação
  'create_clients',
  'create_schedules',
  'create_financial_records',
  'create_stock_items',
  'create_employees',
  'create_medical_records',
  'create_contracts',
  'create_messages',
  'create_files',
  'create_quality_evaluations',
  'create_meeting_alerts',
  
  -- Permissões de edição
  'edit_clients',
  'edit_schedules',
  'edit_financial_records', 
  'edit_stock_items',
  'edit_employees',
  'edit_medical_records',
  'edit_contracts',
  'edit_files',
  'edit_system_settings',
  'edit_user_permissions',
  
  -- Permissões de exclusão
  'delete_clients',
  'delete_schedules',
  'delete_financial_records',
  'delete_stock_items',
  'delete_employees',
  'delete_medical_records',
  'delete_contracts',
  'delete_files',
  
  -- Permissões administrativas
  'manage_users',
  'manage_roles',
  'change_user_passwords',
  'view_audit_logs',
  'manage_system_settings',
  'export_data',
  'import_data',
  'view_sensitive_data',
  
  -- Permissões especiais
  'confirm_appointments',
  'cancel_appointments',
  'approve_timesheet',
  'assign_clients',
  'generate_reports',
  'access_all_units'
);

-- Tabela de cargos customizados
CREATE TABLE custom_job_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de permissões por cargo
CREATE TABLE position_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID REFERENCES custom_job_positions(id) ON DELETE CASCADE,
  permission permission_action NOT NULL,
  granted BOOLEAN DEFAULT true,
  conditions JSONB DEFAULT '{}', -- condições especiais (ex: apenas próprios dados)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(position_id, permission)
);

-- Tabela de atribuição de cargos aos usuários
CREATE TABLE user_job_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  position_id UUID REFERENCES custom_job_positions(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  UNIQUE(user_id, position_id)
);

-- Tabela de permissões específicas por usuário (sobrescreve as do cargo)
CREATE TABLE user_specific_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission permission_action NOT NULL,
  granted BOOLEAN NOT NULL,
  reason TEXT,
  granted_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, permission)
);

-- Histórico de alterações de permissões
CREATE TABLE permission_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID REFERENCES auth.users(id),
  changed_by UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'granted', 'revoked', 'role_assigned', 'role_removed'
  permission permission_action,
  position_id UUID REFERENCES custom_job_positions(id),
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE custom_job_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_job_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_specific_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_audit_log ENABLE ROW LEVEL SECURITY;

-- Policies para custom_job_positions
CREATE POLICY "Administradores podem gerenciar cargos" ON custom_job_positions
  FOR ALL USING (user_has_role(ARRAY['director'::employee_role]));

CREATE POLICY "Usuários podem visualizar cargos ativos" ON custom_job_positions
  FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

-- Policies para position_permissions
CREATE POLICY "Administradores podem gerenciar permissões de cargos" ON position_permissions
  FOR ALL USING (user_has_role(ARRAY['director'::employee_role]));

CREATE POLICY "Usuários podem visualizar permissões de seus cargos" ON position_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_job_assignments uja 
      WHERE uja.user_id = auth.uid() 
      AND uja.position_id = position_permissions.position_id 
      AND uja.is_active = true
    )
  );

-- Policies para user_job_assignments  
CREATE POLICY "Administradores podem gerenciar atribuições" ON user_job_assignments
  FOR ALL USING (user_has_role(ARRAY['director'::employee_role]));

CREATE POLICY "Usuários podem visualizar suas próprias atribuições" ON user_job_assignments
  FOR SELECT USING (user_id = auth.uid());

-- Policies para user_specific_permissions
CREATE POLICY "Administradores podem gerenciar permissões específicas" ON user_specific_permissions
  FOR ALL USING (user_has_role(ARRAY['director'::employee_role]));

CREATE POLICY "Usuários podem visualizar suas próprias permissões" ON user_specific_permissions
  FOR SELECT USING (user_id = auth.uid());

-- Policies para permission_audit_log
CREATE POLICY "Administradores podem visualizar logs de auditoria" ON permission_audit_log
  FOR SELECT USING (user_has_role(ARRAY['director'::employee_role]));

-- Função para verificar se o usuário tem uma permissão específica
CREATE OR REPLACE FUNCTION user_has_permission(user_uuid UUID, required_permission permission_action)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_permission BOOLEAN := false;
BEGIN
  -- Verificar permissões específicas do usuário (sobrescreve outras)
  SELECT granted INTO has_permission
  FROM user_specific_permissions 
  WHERE user_id = user_uuid 
    AND permission = required_permission 
    AND (expires_at IS NULL OR expires_at > NOW());
    
  -- Se encontrou permissão específica, retorna ela
  IF FOUND THEN
    RETURN has_permission;
  END IF;
  
  -- Verificar permissões através dos cargos atribuídos
  SELECT COALESCE(pp.granted, false) INTO has_permission
  FROM user_job_assignments uja
  JOIN position_permissions pp ON pp.position_id = uja.position_id
  JOIN custom_job_positions cjp ON cjp.id = uja.position_id
  WHERE uja.user_id = user_uuid 
    AND uja.is_active = true
    AND cjp.is_active = true
    AND pp.permission = required_permission
    AND pp.granted = true
  LIMIT 1;
  
  RETURN COALESCE(has_permission, false);
END;
$$;

-- Função para obter todas as permissões do usuário
CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid UUID)
RETURNS TABLE(permission permission_action, granted BOOLEAN, source TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Permissões específicas do usuário
  SELECT usp.permission, usp.granted, 'user_specific'::TEXT as source
  FROM user_specific_permissions usp
  WHERE usp.user_id = user_uuid 
    AND (usp.expires_at IS NULL OR usp.expires_at > NOW())
  
  UNION ALL
  
  -- Permissões através de cargos (apenas se não há permissão específica)
  SELECT pp.permission, pp.granted, cjp.name::TEXT as source
  FROM user_job_assignments uja
  JOIN position_permissions pp ON pp.position_id = uja.position_id
  JOIN custom_job_positions cjp ON cjp.id = uja.position_id
  WHERE uja.user_id = user_uuid 
    AND uja.is_active = true
    AND cjp.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM user_specific_permissions usp2 
      WHERE usp2.user_id = user_uuid 
        AND usp2.permission = pp.permission
        AND (usp2.expires_at IS NULL OR usp2.expires_at > NOW())
    );
END;
$$;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_custom_job_positions_updated_at
  BEFORE UPDATE ON custom_job_positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir alguns cargos padrão
INSERT INTO custom_job_positions (name, description, color) VALUES
('Diretor Geral', 'Acesso total ao sistema', '#dc2626'),
('Coordenador', 'Gerenciamento de equipe e processos', '#ea580c'),
('Psicólogo/Neuropsicólogo', 'Atendimento clínico e avaliações', '#2563eb'),
('Secretário Administrativo', 'Gestão administrativa e agendamentos', '#059669'),
('Auxiliar Administrativo', 'Apoio administrativo básico', '#7c3aed'),
('Estagiário', 'Acesso limitado para aprendizado', '#64748b');

-- Inserir permissões padrão para Diretor
INSERT INTO position_permissions (position_id, permission, granted)
SELECT cjp.id, perm.permission, true
FROM custom_job_positions cjp
CROSS JOIN (
  SELECT unnest(enum_range(NULL::permission_action)) as permission
) perm
WHERE cjp.name = 'Diretor Geral';

-- Inserir permissões para Coordenador
INSERT INTO position_permissions (position_id, permission, granted)
SELECT cjp.id, perm.permission, true
FROM custom_job_positions cjp
CROSS JOIN (
  SELECT unnest(ARRAY[
    'view_dashboard', 'view_clients', 'view_schedules', 'view_financial',
    'view_reports', 'view_stock', 'view_employees', 'view_medical_records',
    'view_contracts', 'view_messages', 'view_files', 'view_quality_control',
    'view_timesheet', 'view_meeting_alerts', 'create_clients', 'create_schedules',
    'create_medical_records', 'create_contracts', 'create_messages', 'create_files',
    'create_quality_evaluations', 'create_meeting_alerts', 'edit_clients', 
    'edit_schedules', 'edit_medical_records', 'assign_clients', 'confirm_appointments',
    'cancel_appointments', 'approve_timesheet', 'generate_reports'
  ]::permission_action[]) as permission
) perm
WHERE cjp.name = 'Coordenador';