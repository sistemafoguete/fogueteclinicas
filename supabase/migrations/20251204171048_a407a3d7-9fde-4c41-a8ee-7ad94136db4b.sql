-- Atualizar data de início dos testes baseado na data de criação do cadastro
UPDATE public.clients 
SET neuro_test_start_date = DATE(created_at)
WHERE unit = 'floresta' AND neuro_test_start_date IS NULL;