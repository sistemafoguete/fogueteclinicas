-- Remover TODAS as políticas existentes
DROP POLICY IF EXISTS "Directors can manage all permissions" ON public.user_specific_permissions;
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_specific_permissions;
DROP POLICY IF EXISTS "Usuários podem visualizar suas próprias permissões" ON public.user_specific_permissions;

-- Criar função helper para verificar se é diretor
CREATE OR REPLACE FUNCTION public.is_director()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND employee_role = 'director'
    AND is_active = true
  );
$$;

-- Políticas simples e diretas
CREATE POLICY "Directors have full access"
ON public.user_specific_permissions
FOR ALL
TO authenticated
USING (public.is_director())
WITH CHECK (public.is_director());

CREATE POLICY "Users can view own permissions"
ON public.user_specific_permissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());