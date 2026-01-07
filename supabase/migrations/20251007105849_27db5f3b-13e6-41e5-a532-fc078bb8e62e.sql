-- Criar função melhorada que retorna TODAS as permissões do usuário
-- Incluindo permissões do cargo (role_permissions) e específicas (user_specific_permissions)
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_uuid uuid DEFAULT auth.uid())
RETURNS TABLE(permission permission_action, granted boolean, source text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  -- Permissões específicas do usuário (maior prioridade)
  SELECT 
    usp.permission::permission_action,
    usp.granted,
    'user_specific'::text as source
  FROM user_specific_permissions usp
  WHERE usp.user_id = user_uuid 
    AND (usp.expires_at IS NULL OR usp.expires_at > NOW())
  
  UNION
  
  -- Permissões do cargo (apenas se não houver override específico)
  -- Mapear permission_type para permission_action quando possível
  SELECT 
    CASE 
      -- Mapeamento direto quando os nomes coincidem
      WHEN rp.permission::text = ANY(enum_range(NULL::permission_action)::text[]) 
      THEN rp.permission::text::permission_action
      ELSE NULL
    END as permission,
    rp.granted,
    'role'::text as source
  FROM profiles p
  JOIN role_permissions rp ON rp.employee_role = p.employee_role
  WHERE p.user_id = user_uuid
    AND rp.granted = true
    AND NOT EXISTS (
      SELECT 1 FROM user_specific_permissions usp2 
      WHERE usp2.user_id = user_uuid 
        AND usp2.permission::text = rp.permission::text
        AND (usp2.expires_at IS NULL OR usp2.expires_at > NOW())
    )
    -- Só incluir permissões que existem no enum permission_action
    AND rp.permission::text = ANY(enum_range(NULL::permission_action)::text[]);
END;
$$;

-- Atualizar a função antiga para manter compatibilidade
CREATE OR REPLACE FUNCTION public.user_has_permission(user_uuid uuid, required_permission permission_action)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  has_perm boolean := false;
BEGIN
  -- Verificar em user_specific_permissions primeiro (maior prioridade)
  SELECT granted INTO has_perm
  FROM user_specific_permissions 
  WHERE user_id = user_uuid 
    AND permission = required_permission
    AND (expires_at IS NULL OR expires_at > NOW());
    
  IF FOUND THEN
    RETURN has_perm;
  END IF;
  
  -- Verificar em role_permissions
  SELECT rp.granted INTO has_perm
  FROM profiles p
  JOIN role_permissions rp ON rp.employee_role = p.employee_role
  WHERE p.user_id = user_uuid
    AND rp.permission::text = required_permission::text
    AND rp.granted = true;
  
  RETURN COALESCE(has_perm, false);
END;
$$;