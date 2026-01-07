-- Corrigir erro na política de meeting_alerts
DROP POLICY IF EXISTS "Directors have full access to meeting_alerts" ON public.meeting_alerts;

CREATE POLICY "Directors have full access to meeting_alerts" 
ON public.meeting_alerts 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

-- Adicionar políticas para tabelas que podem ter sido esquecidas
CREATE POLICY "Directors have bypass all restrictions on custom_roles" 
ON public.custom_roles 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

CREATE POLICY "Directors have bypass all restrictions on custom_job_positions" 
ON public.custom_job_positions 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

CREATE POLICY "Directors have bypass all restrictions on user_job_assignments" 
ON public.user_job_assignments 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

CREATE POLICY "Directors have bypass all restrictions on position_permissions" 
ON public.position_permissions 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

CREATE POLICY "Directors have bypass all restrictions on user_specific_permissions" 
ON public.user_specific_permissions 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

-- Criar função especial para diretores bypassarem qualquer restrição
CREATE OR REPLACE FUNCTION public.director_bypass_check()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT employee_role = 'director'::employee_role 
     FROM public.profiles 
     WHERE user_id = auth.uid()), 
    false
  );
$$;