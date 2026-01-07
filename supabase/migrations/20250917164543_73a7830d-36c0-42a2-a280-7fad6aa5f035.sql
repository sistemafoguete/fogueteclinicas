-- Primeiro, criar a função de verificação do diretor
CREATE OR REPLACE FUNCTION public.is_god_mode_director()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = 'director'::employee_role
  );
$$;

-- Função alternativa para bypass completo do diretor
CREATE OR REPLACE FUNCTION public.director_has_god_mode()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_director boolean := false;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = 'director'::employee_role
  ) INTO is_director;
  
  RETURN is_director;
END;
$$;

-- Aplicar algumas políticas essenciais usando a nova função
CREATE POLICY "Director god mode - clients" 
ON public.clients 
FOR ALL 
TO authenticated 
USING (director_has_god_mode())
WITH CHECK (director_has_god_mode());

CREATE POLICY "Director god mode - employees" 
ON public.employees 
FOR ALL 
TO authenticated 
USING (director_has_god_mode());

CREATE POLICY "Director god mode - profiles" 
ON public.profiles 
FOR ALL 
TO authenticated 
USING (director_has_god_mode())
WITH CHECK (director_has_god_mode());

CREATE POLICY "Director god mode - financial_records" 
ON public.financial_records 
FOR ALL 
TO authenticated 
USING (director_has_god_mode())
WITH CHECK (director_has_god_mode());

CREATE POLICY "Director god mode - schedules" 
ON public.schedules 
FOR ALL 
TO authenticated 
USING (director_has_god_mode())
WITH CHECK (director_has_god_mode());