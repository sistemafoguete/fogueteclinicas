-- Check for any views with security definer and fix them
-- List all views to identify which ones might have security definer
SELECT schemaname, viewname, definition 
FROM pg_views 
WHERE schemaname = 'public';

-- Drop and recreate the view to ensure it doesn't have security definer
DROP VIEW IF EXISTS public.employee_details CASCADE;

-- Recreate the view with explicit SECURITY INVOKER (opposite of SECURITY DEFINER)
CREATE VIEW public.employee_details 
WITH (security_invoker = true) AS
SELECT 
  p.id as profile_id,
  p.user_id,
  p.name,
  p.employee_role,
  p.phone,
  p.document_cpf,
  p.document_rg,
  p.birth_date,
  p.address,
  p.is_active,
  p.hire_date,
  p.department,
  p.salary,
  p.permissions,
  e.employee_code,
  e.emergency_contact,
  e.emergency_phone,
  e.professional_license,
  e.specialization,
  e.work_schedule,
  e.notes as employee_notes,
  p.created_at,
  p.updated_at
FROM public.profiles p
LEFT JOIN public.employees e ON p.id = e.profile_id
WHERE p.employee_role IS NOT NULL;