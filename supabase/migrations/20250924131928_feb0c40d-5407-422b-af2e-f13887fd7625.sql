-- Adicionar campo unit na tabela profiles para funcionários
ALTER TABLE public.profiles 
ADD COLUMN unit TEXT CHECK (unit IN ('madre', 'floresta'));

-- Comentário sobre o campo
COMMENT ON COLUMN public.profiles.unit IS 'Unidade onde o funcionário trabalha: madre ou floresta';