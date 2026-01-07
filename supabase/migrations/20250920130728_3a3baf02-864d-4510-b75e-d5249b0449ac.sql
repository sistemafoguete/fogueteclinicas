-- Ativar conta do usuário dominio@fundacaodombosco.org
UPDATE profiles 
SET is_active = true 
WHERE email = 'dominio@fundacaodombosco.org';