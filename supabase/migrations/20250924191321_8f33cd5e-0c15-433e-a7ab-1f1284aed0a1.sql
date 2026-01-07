-- Atualizar todos os clientes para a unidade floresta
UPDATE public.clients 
SET unit = 'floresta' 
WHERE unit IS NULL OR unit != 'floresta';