-- Adicionar coluna email na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Criar índice único para CPF para evitar duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_document_cpf 
ON public.profiles (document_cpf) 
WHERE document_cpf IS NOT NULL AND document_cpf != '';

-- Criar índice único para email para evitar duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email 
ON public.profiles (email) 
WHERE email IS NOT NULL AND email != '';

-- Comentários para documentação
COMMENT ON COLUMN public.profiles.email IS 'Email do funcionário para contato';
COMMENT ON INDEX idx_profiles_document_cpf IS 'Índice único para evitar CPFs duplicados';
COMMENT ON INDEX idx_profiles_email IS 'Índice único para evitar emails duplicados';