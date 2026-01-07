-- Função melhorada para identificar e criar perfil de diretor automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se é o email do diretor principal
  IF NEW.email = 'gsfmoreiracris@hotmail.com' THEN
    -- Criar perfil como diretor
    INSERT INTO public.profiles (
      user_id, 
      name, 
      email, 
      employee_role, 
      is_active
    ) VALUES (
      NEW.id, 
      'Diretor Principal - Cristiane',
      NEW.email,
      'director'::employee_role,
      true
    );
    
    -- Criar registro de employee
    INSERT INTO public.employees (
      user_id,
      profile_id,
      employee_code
    ) VALUES (
      NEW.id,
      (SELECT id FROM public.profiles WHERE user_id = NEW.id),
      'DIR001'
    );
  ELSE
    -- Para outros usuários, usar lógica padrão
    INSERT INTO public.profiles (
      user_id, 
      name, 
      email, 
      employee_role, 
      is_active
    ) VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      NEW.email,
      COALESCE((NEW.raw_user_meta_data->>'employee_role')::public.employee_role, 'staff'::employee_role),
      true
    );
    
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
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Atualizar o trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();