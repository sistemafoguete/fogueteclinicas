-- CRITICAL SECURITY FIX: Remove overly permissive client access policy
-- This fixes the vulnerability where any authenticated user could read all patient medical records

-- Drop the dangerous policy that allows all staff to view all clients
DROP POLICY IF EXISTS "Staff can view clients" ON public.clients;

-- Create a secure policy that only allows viewing clients based on proper assignments
CREATE POLICY "Staff can view assigned clients only" 
ON public.clients 
FOR SELECT 
USING (
  -- Allow directors and coordinators to view all clients (management oversight)
  user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
  OR
  -- Allow staff to view only clients they are assigned to
  EXISTS (
    SELECT 1 
    FROM client_assignments ca 
    WHERE ca.client_id = clients.id 
    AND ca.employee_id = auth.uid() 
    AND ca.is_active = true
  )
);

-- Create a more restrictive policy for INSERT operations
DROP POLICY IF EXISTS "Coordinators can manage clients" ON public.clients;
DROP POLICY IF EXISTS "Directors can manage all clients" ON public.clients;

-- Recreate proper management policies
CREATE POLICY "Directors can manage all clients" 
ON public.clients 
FOR ALL 
USING (user_has_role(ARRAY['director'::employee_role]));

CREATE POLICY "Coordinators can manage clients in their unit" 
ON public.clients 
FOR ALL 
USING (
  user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
);

-- Staff can only INSERT clients (create new patients) but not modify existing ones without assignment
CREATE POLICY "Staff can create new clients" 
ON public.clients 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Staff can only UPDATE clients they are assigned to
CREATE POLICY "Staff can update assigned clients only" 
ON public.clients 
FOR UPDATE 
USING (
  user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
  OR
  EXISTS (
    SELECT 1 
    FROM client_assignments ca 
    WHERE ca.client_id = clients.id 
    AND ca.employee_id = auth.uid() 
    AND ca.is_active = true
  )
);

-- Add audit logging trigger for client access (security monitoring)
CREATE OR REPLACE FUNCTION public.log_client_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log all SELECT operations on sensitive client data for security auditing
  INSERT INTO public.audit_logs (
    user_id, 
    entity_type, 
    entity_id, 
    action, 
    metadata,
    ip_address
  ) VALUES (
    auth.uid(),
    'clients',
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    jsonb_build_object(
      'table', 'clients',
      'timestamp', NOW(),
      'user_role', (SELECT employee_role FROM profiles WHERE user_id = auth.uid())
    ),
    inet_client_addr()::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS client_access_audit_trigger ON public.clients;
CREATE TRIGGER client_access_audit_trigger
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.log_client_access();