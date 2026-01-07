-- Remover função duplicada e manter apenas uma versão
DROP FUNCTION IF EXISTS public.create_employee_direct(p_email text, p_password text, p_name text, p_employee_role text, p_phone text, p_department text);

-- Manter apenas a versão que usa employee_role enum
-- Esta função já existe e funciona corretamente