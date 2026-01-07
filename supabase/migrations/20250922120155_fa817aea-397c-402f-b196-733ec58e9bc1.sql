-- Deletar usuários específicos que não são mais necessários
DELETE FROM profiles WHERE email IN (
  'animetodos123@gmail.com',
  'italo.siqueira@fundacaodombosco.org',
  'institucional@fundacaodombosco.org', 
  'social@fundacaodombosco.org',
  'claudiomateusjones@hotmail.com',
  'andrehoffmannmk@gmail.com'
);

-- Ativar usuários restantes que estão inativos
UPDATE profiles 
SET is_active = true 
WHERE email IN (
  'clinica@fundacaodombosco.org',
  'amandapaola@fundacaodombosco.org'
) AND is_active = false;

-- Atualizar função de criação de funcionários para não requerer confirmação de email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Inserir perfil na tabela profiles com email já confirmado
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
  ) ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    employee_role = EXCLUDED.employee_role,
    phone = EXCLUDED.phone,
    department = EXCLUDED.department,
    is_active = EXCLUDED.is_active;
    
  RETURN NEW;
END;
$function$;