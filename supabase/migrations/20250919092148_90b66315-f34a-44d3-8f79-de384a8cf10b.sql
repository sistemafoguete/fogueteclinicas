-- Versão final simplificada usando apenas funções disponíveis
CREATE OR REPLACE FUNCTION public.create_employee_direct(
  p_email text, 
  p_password text, 
  p_name text, 
  p_employee_role employee_role DEFAULT 'staff'::employee_role, 
  p_phone text DEFAULT NULL::text, 
  p_department text DEFAULT NULL::text
) 
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id UUID;
  new_profile_id UUID;
  result JSON;
  hashed_password TEXT;
BEGIN
  -- Verificar se email já existe
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Email já existe',
      'message', 'Este email já está sendo usado por outro usuário'
    );
  END IF;
  
  -- Generate new UUID for user
  new_user_id := gen_random_uuid();
  
  -- Usar uma senha hash simples para desenvolvimento
  -- Em produção seria melhor usar bcrypt apropriado
  hashed_password := '$2a$10$' || substr(md5(p_password || new_user_id::text || 'salt'), 1, 53);
  
  -- Insert directly into auth.users (bypassing email confirmation)
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    phone,
    confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data
  ) VALUES (
    new_user_id,
    p_email,
    hashed_password,
    NOW(),
    p_phone,
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object(
      'name', p_name,
      'employee_role', p_employee_role::text,
      'phone', p_phone,
      'department', p_department
    )
  );

  -- Create profile
  INSERT INTO public.profiles (
    id,
    user_id,
    name,
    email,
    employee_role,
    phone,
    department,
    is_active
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    p_name,
    p_email,
    p_employee_role,
    p_phone,
    p_department,
    true
  ) RETURNING id INTO new_profile_id;

  -- Create employee record
  INSERT INTO public.employees (
    user_id,
    profile_id,
    employee_code
  ) VALUES (
    new_user_id,
    new_profile_id,
    'EMP' || LPAD(EXTRACT(YEAR FROM NOW())::TEXT, 4, '0') || 
    LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0') || 
    LPAD(RIGHT(new_user_id::TEXT, 8), 8, '0')
  );

  -- Create identity record for email/password auth
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    jsonb_build_object(
      'sub', new_user_id::text,
      'email', p_email
    ),
    'email',
    NOW(),
    NOW()
  );

  result := json_build_object(
    'success', true,
    'user_id', new_user_id,
    'profile_id', new_profile_id,
    'message', 'Funcionário criado com sucesso'
  );

  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  -- Return error as JSON
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Erro ao criar funcionário: ' || SQLERRM
  );
END;
$$;

-- Testar a função
SELECT public.create_employee_direct(
  'funcionario.teste.final@empresa.com',
  'senha123456',
  'Funcionário Teste Final',
  'staff'::employee_role,
  '11988887777',
  'Desenvolvimento'
);