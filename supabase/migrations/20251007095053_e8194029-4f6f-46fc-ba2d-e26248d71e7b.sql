-- Drop ALL existing policies on profiles table
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_record.policyname);
    END LOOP;
END $$;

-- Create security definer functions to check roles without recursion
CREATE OR REPLACE FUNCTION public.user_has_role(allowed_roles employee_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = ANY(allowed_roles)
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_director()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = 'director'::employee_role
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_coordinator()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND employee_role IN ('coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role)
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND employee_role IN ('director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role)
    AND is_active = true
  );
$$;

-- Create new safe policies for profiles using security definer functions
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Directors have full access"
ON public.profiles
FOR ALL
USING (public.is_director())
WITH CHECK (public.is_director());

CREATE POLICY "Coordinators can view profiles"
ON public.profiles
FOR SELECT
USING (public.is_coordinator());

CREATE POLICY "Management can create profiles"
ON public.profiles
FOR INSERT
WITH CHECK (public.is_manager());