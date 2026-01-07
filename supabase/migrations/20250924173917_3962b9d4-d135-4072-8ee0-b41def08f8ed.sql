-- Remover duplicatas mantendo apenas o primeiro registro de cada cliente
-- Usar uma CTE para identificar duplicatas e deletar as mais recentes

WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY name, COALESCE(cpf, 'no_cpf') 
           ORDER BY created_at ASC, id ASC
         ) as rn
  FROM public.clients
  WHERE created_at >= '2025-01-24'::date
)
DELETE FROM public.clients 
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE rn > 1
);

-- Atualizar todos os clientes restantes para unidade "floresta" 
UPDATE public.clients 
SET unit = 'floresta'
WHERE created_at >= '2025-01-24'::date;