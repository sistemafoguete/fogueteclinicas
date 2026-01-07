-- Deletar funcionários específicos da base de dados

-- Primeiro, vamos deletar das tabelas relacionadas usando os emails para identificar os user_ids
-- Deletar de employees (tabela de funcionários)
DELETE FROM public.employees 
WHERE user_id IN (
  SELECT user_id FROM public.profiles 
  WHERE email IN (
    'andrehoffmannmk@gmail.com',
    'claudiomateusjones@hotmail.com', 
    'elvimar@fundacaodombo sco.org',
    'mateusjones19@gmail.com',
    'rabelogabs5@gmail.com'
  )
);

-- Deletar de client_assignments (atribuições de clientes)
DELETE FROM public.client_assignments 
WHERE employee_id IN (
  SELECT user_id FROM public.profiles 
  WHERE email IN (
    'andrehoffmannmk@gmail.com',
    'claudiomateusjones@hotmail.com', 
    'elvimar@fundacaodombo sco.org',
    'mateusjones19@gmail.com',
    'rabelogabs5@gmail.com'
  )
) OR assigned_by IN (
  SELECT user_id FROM public.profiles 
  WHERE email IN (
    'andrehoffmannmk@gmail.com',
    'claudiomateusjones@hotmail.com', 
    'elvimar@fundacaodombo sco.org',
    'mateusjones19@gmail.com',
    'rabelogabs5@gmail.com'
  )
);

-- Deletar de employee_timesheet (registros de ponto)
DELETE FROM public.employee_timesheet 
WHERE employee_id IN (
  SELECT user_id FROM public.profiles 
  WHERE email IN (
    'andrehoffmannmk@gmail.com',
    'claudiomateusjones@hotmail.com', 
    'elvimar@fundacaodombo sco.org',
    'mateusjones19@gmail.com',
    'rabelogabs5@gmail.com'
  )
) OR approved_by IN (
  SELECT user_id FROM public.profiles 
  WHERE email IN (
    'andrehoffmannmk@gmail.com',
    'claudiomateusjones@hotmail.com', 
    'elvimar@fundacaodombo sco.org',
    'mateusjones19@gmail.com',
    'rabelogabs5@gmail.com'
  )
);

-- Deletar de user_job_assignments (atribuições de cargos customizados)
DELETE FROM public.user_job_assignments 
WHERE user_id IN (
  SELECT user_id FROM public.profiles 
  WHERE email IN (
    'andrehoffmannmk@gmail.com',
    'claudiomateusjones@hotmail.com', 
    'elvimar@fundacaodombo sco.org',
    'mateusjones19@gmail.com',
    'rabelogabs5@gmail.com'
  )
);

-- Deletar de user_specific_permissions (permissões específicas)
DELETE FROM public.user_specific_permissions 
WHERE user_id IN (
  SELECT user_id FROM public.profiles 
  WHERE email IN (
    'andrehoffmannmk@gmail.com',
    'claudiomateusjones@hotmail.com', 
    'elvimar@fundacaodombo sco.org',
    'mateusjones19@gmail.com',
    'rabelogabs5@gmail.com'
  )
);

-- Deletar schedules onde esses usuários são profissionais
DELETE FROM public.schedules 
WHERE employee_id IN (
  SELECT user_id FROM public.profiles 
  WHERE email IN (
    'andrehoffmannmk@gmail.com',
    'claudiomateusjones@hotmail.com', 
    'elvimar@fundacaodombo sco.org',
    'mateusjones19@gmail.com',
    'rabelogabs5@gmail.com'
  )
) OR created_by IN (
  SELECT user_id FROM public.profiles 
  WHERE email IN (
    'andrehoffmannmk@gmail.com',
    'claudiomateusjones@hotmail.com', 
    'elvimar@fundacaodombo sco.org',
    'mateusjones19@gmail.com',
    'rabelogabs5@gmail.com'
  )
);

-- Deletar de profiles (perfis dos usuários)
DELETE FROM public.profiles 
WHERE email IN (
  'andrehoffmannmk@gmail.com',
  'claudiomateusjones@hotmail.com', 
  'elvimar@fundacaodombo sco.org',
  'mateusjones19@gmail.com',
  'rabelogabs5@gmail.com'
);

-- ATENÇÃO: Os usuários na tabela auth.users não podem ser deletados via SQL
-- Eles precisam ser removidos através do painel do Supabase Auth
-- Esta migração remove apenas os dados das tabelas públicas

-- Confirmar quantos funcionários foram removidos
SELECT 'Funcionários removidos das tabelas públicas. Para remover completamente, delete os usuários do Auth no painel do Supabase.' as resultado;