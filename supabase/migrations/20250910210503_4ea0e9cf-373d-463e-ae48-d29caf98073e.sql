-- Ativar todos os profiles de usuários para permitir comunicação
UPDATE public.profiles 
SET is_active = true, 
    email = COALESCE(
      email,
      (SELECT email FROM auth.users WHERE id = profiles.user_id)
    )
WHERE user_id IN (SELECT id FROM auth.users);

-- Verificar se todos os usuários têm profiles
INSERT INTO public.profiles (user_id, name, email, employee_role, is_active, hire_date)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) as name,
  u.email,
  COALESCE((u.raw_user_meta_data->>'employee_role')::public.employee_role, 'staff'::public.employee_role),
  true,
  CURRENT_DATE
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id);