-- Criar ou recriar a função handle_new_user para usuários sem perfil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  -- Inserir perfil na tabela profiles
  INSERT INTO public.profiles (
    user_id, 
    name, 
    email, 
    employee_role, 
    phone, 
    department,
    is_active
  ) VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'employee_role')::public.employee_role, 'staff'::employee_role),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'department',
    true
  ) ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Recriar a trigger (caso não exista ou esteja com problemas)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Criar profiles para usuários existentes que não têm perfil
INSERT INTO public.profiles (user_id, name, email, employee_role, is_active)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
  au.email,
  COALESCE((au.raw_user_meta_data->>'employee_role')::public.employee_role, 'staff'::employee_role) as employee_role,
  true as is_active
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Criar trigger para inicializar employee records automaticamente
CREATE OR REPLACE FUNCTION public.initialize_employee_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Criar registro de employee se não existe
  INSERT INTO public.employees (
    user_id, 
    profile_id, 
    employee_code
  ) VALUES (
    NEW.user_id, 
    NEW.id, 
    'EMP' || LPAD(EXTRACT(YEAR FROM NOW())::TEXT, 4, '0') || 
    LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0') || 
    LPAD(RIGHT(NEW.id::TEXT, 8), 8, '0')
  ) ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para employees
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.initialize_employee_record();