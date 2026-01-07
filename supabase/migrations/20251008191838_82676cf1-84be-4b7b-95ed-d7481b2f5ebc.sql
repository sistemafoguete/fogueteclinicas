-- Atualizar unidade do usuário Sarah para 'floresta'
UPDATE public.profiles 
SET unit = 'floresta'
WHERE user_id = 'de7a3b9a-ab66-4260-8922-64c3cb3ee0f4' 
AND unit IS NULL;