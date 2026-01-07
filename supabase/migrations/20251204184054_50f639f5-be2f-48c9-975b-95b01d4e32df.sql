-- Adicionar coluna para CPF do responsável financeiro
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS responsible_cpf TEXT;