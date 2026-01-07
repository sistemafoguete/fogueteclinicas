-- Atualizar itens com category null para um valor padrão válido
UPDATE public.stock_items 
SET category = 'Outros' 
WHERE category IS NULL OR category = '';

-- Atualizar itens com unit null para um valor padrão válido  
UPDATE public.stock_items 
SET unit = 'Unidade' 
WHERE unit IS NULL OR unit = '';