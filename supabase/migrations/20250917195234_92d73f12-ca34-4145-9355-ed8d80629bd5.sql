-- Criar atribuições automáticas para que os profissionais possam agendar
-- Atribuir todos os clientes ativos ao diretor
INSERT INTO public.client_assignments (client_id, employee_id, assigned_by, is_active)
SELECT 
  c.id as client_id,
  p.user_id as employee_id,
  p.user_id as assigned_by,
  true as is_active
FROM clients c
CROSS JOIN profiles p
WHERE c.is_active = true 
  AND p.is_active = true 
  AND p.employee_role IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM client_assignments ca 
    WHERE ca.client_id = c.id 
    AND ca.employee_id = p.user_id
  );

-- Melhorar a trigger de validação para ser mais flexível
CREATE OR REPLACE FUNCTION public.validate_schedule_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role employee_role;
  is_admin boolean := false;
BEGIN
  -- Buscar o papel do usuário atual
  SELECT employee_role INTO user_role
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  -- Se não encontrou o perfil, permitir (pode ser um usuário novo)
  IF user_role IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Verificar se é administrativo (pode agendar para qualquer um)
  is_admin := user_role IN ('director', 'coordinator_madre', 'coordinator_floresta', 'receptionist');
  
  -- Administradores podem agendar para qualquer um
  IF is_admin THEN
    RETURN NEW;
  END IF;
  
  -- Se não for administrativo, só pode agendar para si mesmo
  IF NEW.employee_id != auth.uid() THEN
    RAISE EXCEPTION 'Profissionais só podem agendar atendimentos para si mesmos. Seu papel: %', user_role;
  END IF;
  
  -- Se não for administrativo, verificar se o cliente está vinculado (mais flexível)
  IF NOT EXISTS (
    SELECT 1 FROM public.client_assignments 
    WHERE client_id = NEW.client_id 
    AND employee_id = auth.uid() 
    AND is_active = true
  ) THEN
    -- Se não há atribuição específica mas é um cliente ativo, permitir
    IF EXISTS (SELECT 1 FROM public.clients WHERE id = NEW.client_id AND is_active = true) THEN
      -- Criar automaticamente a atribuição
      INSERT INTO public.client_assignments (client_id, employee_id, assigned_by, is_active)
      VALUES (NEW.client_id, auth.uid(), auth.uid(), true);
    ELSE
      RAISE EXCEPTION 'Cliente não encontrado ou inativo';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;