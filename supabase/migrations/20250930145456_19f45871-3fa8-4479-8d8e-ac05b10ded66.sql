-- Atualizar Christopher Menezes Coelho para coordenador da Madre
UPDATE public.profiles 
SET employee_role = 'coordinator_madre'::employee_role
WHERE user_id = 'cd933617-bab8-42bd-abe4-bc44502d97b4';