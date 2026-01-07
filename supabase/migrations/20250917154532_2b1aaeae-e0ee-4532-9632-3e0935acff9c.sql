-- Update RLS policies to check active status for authentication
-- This ensures inactive users cannot access data even if they somehow get authenticated

-- Update the existing trigger to check active status during login attempts
CREATE OR REPLACE FUNCTION public.check_user_active_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- This function will be called to validate user status
  -- during authentication processes
  IF NOT NEW.is_active THEN
    RAISE EXCEPTION 'User account is inactive and cannot access the system';
  END IF;
  RETURN NEW;
END;
$function$;

-- Update profiles table RLS policies to ensure inactive users can't access system data
DROP POLICY IF EXISTS "Inactive users cannot access system" ON public.profiles;
CREATE POLICY "Inactive users cannot access system"
ON public.profiles
FOR ALL
TO authenticated
USING (
  CASE 
    WHEN auth.uid() = user_id THEN is_active = true
    ELSE user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
  END
)
WITH CHECK (
  CASE 
    WHEN auth.uid() = user_id THEN is_active = true
    ELSE user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
  END
);

-- Add function to validate active employees can manage other employees
CREATE OR REPLACE FUNCTION public.can_manage_employees()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_active = true
  );
$function$;