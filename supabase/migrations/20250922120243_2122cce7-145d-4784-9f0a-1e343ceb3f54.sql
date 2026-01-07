-- Primeiro, deletar todos os registros relacionados aos usuários que queremos excluir
DELETE FROM schedules WHERE employee_id IN (
  SELECT user_id FROM profiles WHERE email IN (
    'animetodos123@gmail.com',
    'italo.siqueira@fundacaodombosco.org',
    'institucional@fundacaodombosco.org', 
    'social@fundacaodombosco.org',
    'claudiomateusjones@hotmail.com',
    'andrehoffmannmk@gmail.com'
  )
);

-- Deletar registros de employees relacionados
DELETE FROM employees WHERE user_id IN (
  SELECT user_id FROM profiles WHERE email IN (
    'animetodos123@gmail.com',
    'italo.siqueira@fundacaodombosco.org',
    'institucional@fundacaodombosco.org', 
    'social@fundacaodombosco.org',
    'claudiomateusjones@hotmail.com',
    'andrehoffmannmk@gmail.com'
  )
);

-- Deletar quaisquer outros registros relacionados
DELETE FROM client_assignments WHERE employee_id IN (
  SELECT user_id FROM profiles WHERE email IN (
    'animetodos123@gmail.com',
    'italo.siqueira@fundacaodombosco.org',
    'institucional@fundacaodombosco.org', 
    'social@fundacaodombosco.org',
    'claudiomateusjones@hotmail.com',
    'andrehoffmannmk@gmail.com'
  )
);

-- Agora deletar os perfis de usuários
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