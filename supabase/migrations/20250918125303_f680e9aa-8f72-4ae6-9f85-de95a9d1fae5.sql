-- Fix user sessions constraint issue
DROP INDEX IF EXISTS idx_user_sessions_user_active;
CREATE UNIQUE INDEX idx_user_sessions_user_active ON user_sessions(user_id) WHERE is_active = true;

-- Create function to create employees without email confirmation
CREATE OR REPLACE FUNCTION create_employee_direct(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT,
  p_employee_role employee_role DEFAULT 'staff'::employee_role,
  p_phone TEXT DEFAULT NULL,
  p_department TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id UUID;
  new_profile_id UUID;
  result JSON;
BEGIN
  -- Generate new UUID for user
  new_user_id := gen_random_uuid();
  
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
    crypt(p_password, gen_salt('bf')),
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