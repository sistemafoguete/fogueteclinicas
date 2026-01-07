-- Adicionar novos campos de neuroavaliação na tabela clients
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS neuro_patient_code TEXT,
ADD COLUMN IF NOT EXISTS neuro_relevant_history TEXT,
ADD COLUMN IF NOT EXISTS neuro_diagnostic_agreement TEXT,
ADD COLUMN IF NOT EXISTS neuro_divergence_type TEXT,
ADD COLUMN IF NOT EXISTS neuro_observations TEXT;