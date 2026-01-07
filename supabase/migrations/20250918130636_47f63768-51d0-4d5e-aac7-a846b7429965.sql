-- Drop and recreate the function with better error handling and security context
DROP FUNCTION IF EXISTS create_employee_direct(text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION create_employee_direct(
  p_email text,
  p_password text,
  p_name text,
  p_employee_role text,
  p_phone text DEFAULT NULL,
  p_department text DEFAULT NULL
) 
RETURNS json 
SECURITY DEFINER 
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  new_user_id UUID;
  new_profile_id UUID;
  result JSON;
  encrypted_pw TEXT;
BEGIN
  -- Generate new UUID for user
  new_user_id := gen_random_uuid();
  
  -- Encrypt password using Supabase's method
  encrypted_pw := crypt(p_password, gen_salt('bf'));
  
  -- Insert directly into auth.users (bypassing all email workflows)
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
    raw_user_meta_data,
    role,
    aud
  ) VALUES (
    new_user_id,
    p_email,
    encrypted_pw,
    NOW(),
    p_phone,
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object(
      'name', p_name,
      'employee_role', p_employee_role,
      'phone', p_phone,
      'department', p_department
    ),
    'authenticated',
    'authenticated'
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
      'email', p_email,
      'email_verified', true
    ),
    'email',
    NOW(),
    NOW()
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

  -- Create employee record if employees table exists
  BEGIN
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
  EXCEPTION WHEN undefined_table THEN
    -- Ignore if employees table doesn't exist
    NULL;
  END;

  result := json_build_object(
    'success', true,
    'user_id', new_user_id,
    'profile_id', new_profile_id,
    'message', 'Funcionário criado com sucesso'
  );

  RETURN result;
  
EXCEPTION WHEN unique_violation THEN
  -- Handle duplicate email
  RETURN json_build_object(
    'success', false,
    'error', 'Email já existe no sistema',
    'message', 'Este email já está cadastrado no sistema'
  );
WHEN OTHERS THEN
  -- Return error as JSON
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Erro ao criar funcionário: ' || SQLERRM
  );
END;
$$;