-- Atualizar todos os clientes importados para a unidade "floresta"
UPDATE public.clients 
SET unit = 'floresta'
WHERE created_at >= '2025-01-24'::date
  AND (unit = 'madre' OR unit IS NULL);

-- Garantir que todos os clientes estão ativos
UPDATE public.clients 
SET is_active = true 
WHERE created_at >= '2025-01-24'::date;