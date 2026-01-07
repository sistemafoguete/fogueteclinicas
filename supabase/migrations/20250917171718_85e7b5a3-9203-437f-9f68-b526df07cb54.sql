-- Fix security warnings by updating function search paths
CREATE OR REPLACE FUNCTION public.get_employee_name(employee_uuid UUID)
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT name 
    FROM public.profiles 
    WHERE user_id = employee_uuid
    LIMIT 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_client_name(client_uuid UUID)
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT name 
    FROM public.clients 
    WHERE id = client_uuid
    LIMIT 1
  );
END;
$$;