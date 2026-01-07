-- Criar usuário diretor Elvimar Peixoto
-- Este script cria o usuário diretamente no auth.users e profile

-- Inserir na tabela auth.users (necessário usar a API do Supabase Admin)
-- Como não podemos inserir diretamente em auth.users via SQL por segurança,
-- vamos criar uma função que usa a API administrativa

-- Primeiro, vamos garantir que temos uma função helper para criar usuários
CREATE OR REPLACE FUNCTION public.create_director_user()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
  result json;
BEGIN
  -- Gerar um UUID para o novo usuário
  new_user_id := gen_random_uuid();
  
  -- Inserir diretamente no perfil com as informações
  -- O trigger handle_new_user irá criar o usuário no auth
  INSERT INTO public.profiles (
    user_id,
    name,
    employee_role,
    is_active,
    unit,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    'Elvimar Peixoto',
    'director'::employee_role,
    true,
    'madre',
    now(),
    now()
  );
  
  result := json_build_object(
    'success', true,
    'user_id', new_user_id,
    'message', 'Usuário diretor criado. Use a interface ou edge function para definir email e senha.'
  );
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Dar permissão para executar a função
GRANT EXECUTE ON FUNCTION public.create_director_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_director_user() TO service_role;