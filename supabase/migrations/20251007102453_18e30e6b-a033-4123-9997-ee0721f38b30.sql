-- Remover políticas antigas da tabela user_specific_permissions
DROP POLICY IF EXISTS "Usuários podem visualizar cargos ativos" ON public.user_specific_permissions;
DROP POLICY IF EXISTS "Users can view their permissions" ON public.user_specific_permissions;

-- Criar políticas corretas para user_specific_permissions

-- Diretores podem fazer tudo
CREATE POLICY "Directors can manage all permissions"
ON public.user_specific_permissions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND employee_role = 'director'
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND employee_role = 'director'
    AND is_active = true
  )
);

-- Usuários podem ver suas próprias permissões
CREATE POLICY "Users can view their own permissions"
ON public.user_specific_permissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());