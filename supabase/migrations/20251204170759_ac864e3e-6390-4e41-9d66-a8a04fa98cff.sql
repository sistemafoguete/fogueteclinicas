-- Atualizar gênero dos pacientes baseado nos nomes
-- Nomes masculinos
UPDATE public.clients SET gender = 'masculino' WHERE unit = 'floresta' AND gender IS NULL AND (
  name ILIKE 'Alan%' OR name ILIKE 'Antônio%' OR name ILIKE 'Antonio%' OR name ILIKE 'Arthur%' OR 
  name ILIKE 'Benício%' OR name ILIKE 'Bento%' OR name ILIKE 'Bernardo%' OR name ILIKE 'Breno%' OR 
  name ILIKE 'Bryan%' OR name ILIKE 'Carlos%' OR name ILIKE 'Clóvis%' OR name ILIKE 'Daniel %' OR 
  name ILIKE 'Davi%' OR name ILIKE 'Emanuel%' OR name ILIKE 'Gabriel%' OR name ILIKE 'Guilherme%' OR 
  name ILIKE 'Heitor%' OR name ILIKE 'Henrique%' OR name ILIKE 'Hithallon%' OR name ILIKE 'Horacio%' OR 
  name ILIKE 'Hyan%' OR name ILIKE 'Israel%' OR name ILIKE 'João%' OR name ILIKE 'Joao%' OR 
  name ILIKE 'Kevyn%' OR name ILIKE 'Leônidas%' OR name ILIKE 'Lorenzo%' OR name ILIKE 'Luan%' OR 
  name ILIKE 'Lucas%' OR name ILIKE 'Marcos%' OR name ILIKE 'Mateus%' OR name ILIKE 'Matheus%' OR 
  name ILIKE 'Matias%' OR name ILIKE 'Miguel%' OR name ILIKE 'Nathan%' OR name ILIKE 'Noah%' OR 
  name ILIKE 'Otoniel%' OR name ILIKE 'Pedro%' OR name ILIKE 'Rafael %' OR name ILIKE 'Raul%' OR 
  name ILIKE 'Richard%' OR name ILIKE 'Rômulo%' OR name ILIKE 'Theo%' OR name ILIKE 'Thiago%' OR 
  name ILIKE 'Victor%' OR name ILIKE 'Vinícius%' OR name ILIKE 'Vitor%'
);

-- Nomes femininos
UPDATE public.clients SET gender = 'feminino' WHERE unit = 'floresta' AND gender IS NULL AND (
  name ILIKE 'Alyce%' OR name ILIKE 'Ana %' OR name ILIKE 'Bianca%' OR name ILIKE 'Bruna%' OR 
  name ILIKE 'Daniela%' OR name ILIKE 'Elis %' OR name ILIKE 'Eloá%' OR name ILIKE 'Esther%' OR 
  name ILIKE 'Fernanda%' OR name ILIKE 'Flávia%' OR name ILIKE 'Inglecia%' OR name ILIKE 'Isadora%' OR 
  name ILIKE 'Jeanne%' OR name ILIKE 'Jéssica%' OR name ILIKE 'Jessica%' OR name ILIKE 'Ketlen%' OR 
  name ILIKE 'Laura%' OR name ILIKE 'Letícia%' OR name ILIKE 'Lucelia%' OR name ILIKE 'Lydia%' OR 
  name ILIKE 'Maíra%' OR name ILIKE 'Marcela%' OR name ILIKE 'Maria%' OR name ILIKE 'Nathalia%' OR 
  name ILIKE 'Poliana%' OR name ILIKE 'Rafaella%' OR name ILIKE 'Renata%' OR name ILIKE 'Roberta%' OR 
  name ILIKE 'Sarah%' OR name ILIKE 'Selena%' OR name ILIKE 'Stela%' OR name ILIKE 'Stella%' OR 
  name ILIKE 'Valentina%' OR name ILIKE 'Valquiria%' OR name ILIKE 'Vanessa%' OR name ILIKE 'Yasmin%'
);