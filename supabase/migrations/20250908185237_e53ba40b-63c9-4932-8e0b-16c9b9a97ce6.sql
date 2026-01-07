-- Criar tabela para cargos customizados
CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Habilitar RLS
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;

-- Políticas para custom_roles
CREATE POLICY "Directors can manage custom roles" 
ON custom_roles 
FOR ALL 
USING (user_has_role(ARRAY['director'::employee_role]));

CREATE POLICY "Staff can view active custom roles" 
ON custom_roles 
FOR SELECT 
USING (is_active = true AND auth.uid() IS NOT NULL);

-- Criar tabela para permissões granulares
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  permission_value TEXT NOT NULL DEFAULT 'none',
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission_key)
);

-- Habilitar RLS
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas para user_permissions
CREATE POLICY "Directors can manage all permissions" 
ON user_permissions 
FOR ALL 
USING (user_has_role(ARRAY['director'::employee_role]));

CREATE POLICY "Users can view their own permissions" 
ON user_permissions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_custom_roles_updated_at
BEFORE UPDATE ON custom_roles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON user_permissions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();