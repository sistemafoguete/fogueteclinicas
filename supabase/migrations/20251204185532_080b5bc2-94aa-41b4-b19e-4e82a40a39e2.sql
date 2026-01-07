-- Adicionar coluna CPF do Responsável Financeiro à tabela clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS responsible_cpf TEXT;