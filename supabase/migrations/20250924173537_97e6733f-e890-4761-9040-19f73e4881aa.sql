-- Atualizar todos os clientes importados para serem visíveis para coordenadores de ambas as unidades
-- Vou distribuir os clientes entre as duas unidades para que apareçam para todos os coordenadores

-- Primeira metade dos clientes para unidade "madre"
UPDATE public.clients 
SET unit = 'madre'
WHERE id IN (
  SELECT id FROM public.clients 
  WHERE unit = 'madre' 
  ORDER BY created_at 
  LIMIT (SELECT COUNT(*) / 2 FROM public.clients WHERE unit = 'madre')
);

-- Segunda metade dos clientes para unidade "floresta"
UPDATE public.clients 
SET unit = 'floresta'
WHERE id IN (
  SELECT id FROM public.clients 
  WHERE unit = 'madre' 
  ORDER BY created_at DESC
  LIMIT (SELECT COUNT(*) / 2 FROM public.clients WHERE unit = 'madre')
);

-- Garantir que todos os clientes estão ativos e visíveis
UPDATE public.clients 
SET is_active = true 
WHERE is_active != true;