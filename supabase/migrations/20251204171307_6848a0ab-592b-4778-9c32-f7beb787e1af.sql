-- Atualizar gênero dos pacientes que ainda estão sem informação
UPDATE public.clients SET gender = 'feminino' WHERE unit = 'floresta' AND gender IS NULL AND (
  name ILIKE 'Daniela%' OR name ILIKE 'Eloá%' OR name ILIKE 'Fernanda%' OR 
  name ILIKE 'Letícia%' OR name ILIKE 'Stella%' OR name ILIKE 'Valquiria%'
);

UPDATE public.clients SET gender = 'masculino' WHERE unit = 'floresta' AND gender IS NULL AND (
  name ILIKE 'João%' OR name ILIKE 'Rafael%'
);