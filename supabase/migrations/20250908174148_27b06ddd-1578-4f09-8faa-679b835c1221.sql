-- Fix the security definer view issue
DROP VIEW IF EXISTS public.employee_details;

-- Recreate the view without security_barrier
CREATE OR REPLACE VIEW public.employee_details AS
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

-- Enable RLS on the view will inherit from the underlying tables
-- No additional configuration needed as RLS is handled by the base tables