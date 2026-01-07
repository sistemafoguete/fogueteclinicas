-- Permitir que usuários autenticados vejam perfis de outros usuários para mensagens diretas
CREATE POLICY "Authenticated users can view other profiles for messaging"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND is_active = true
);