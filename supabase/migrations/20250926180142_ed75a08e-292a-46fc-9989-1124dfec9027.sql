-- Primeiro, vamos ver e corrigir o trigger handle_employee_signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_employee_signup();

-- Criar função corrigida para armazenar funcionário no backend
CREATE OR REPLACE FUNCTION public.handle_employee_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir perfil na tabela profiles com dados do signup
  INSERT INTO public.profiles (
    user_id, 
    name, 
    email, 
    employee_role, 
    phone, 
    document_cpf,
    department,
    is_active
  ) VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'employee_role')::public.employee_role, 'staff'::employee_role),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'document_cpf',
    NEW.raw_user_meta_data->>'department',
    true
  ) ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    employee_role = EXCLUDED.employee_role,
    phone = EXCLUDED.phone,
    document_cpf = EXCLUDED.document_cpf,
    department = EXCLUDED.department,
    is_active = EXCLUDED.is_active;
    
  -- Inserir registro de employee apenas se não existir
  INSERT INTO public.employees (
    user_id,
    profile_id,
    employee_code
  ) 
  SELECT 
    NEW.id,
    p.id,
    'EMP' || LPAD(EXTRACT(YEAR FROM NOW())::TEXT, 4, '0') || 
    LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0') || 
    LPAD(RIGHT(NEW.id::TEXT, 8), 8, '0')
  FROM public.profiles p 
  WHERE p.user_id = NEW.id
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Recriar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_employee_signup();