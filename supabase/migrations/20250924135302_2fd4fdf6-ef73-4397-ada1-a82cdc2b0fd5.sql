-- Update stock management function to include coordinator_floresta
CREATE OR REPLACE FUNCTION public.can_manage_stock()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT user_has_any_role(ARRAY['director', 'financeiro', 'coordinator_madre', 'coordinator_floresta']::employee_role[]);
$function$;