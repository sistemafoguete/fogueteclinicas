-- Remover a função create_employee_direct problemática e substituir por uma mais simples
DROP FUNCTION IF EXISTS public.create_employee_direct(text, text, text, employee_role, text, text);

-- Função simplificada para criar perfil após signup do Supabase
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
    is_active
  ) VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'employee_role')::public.employee_role, 'staff'::employee_role),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'document_cpf',
    true
  ) ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    employee_role = EXCLUDED.employee_role,
    phone = EXCLUDED.phone,
    document_cpf = EXCLUDED.document_cpf,
    is_active = EXCLUDED.is_active;
    
  -- Inserir registro de employee
  INSERT INTO public.employees (
    user_id,
    profile_id,
    employee_code
  ) VALUES (
    NEW.id,
    (SELECT id FROM public.profiles WHERE user_id = NEW.id),
    'EMP' || LPAD(EXTRACT(YEAR FROM NOW())::TEXT, 4, '0') || 
    LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0') || 
    LPAD(RIGHT(NEW.id::TEXT, 8), 8, '0')
  ) ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para executar após inserção de usuário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_employee_signup();