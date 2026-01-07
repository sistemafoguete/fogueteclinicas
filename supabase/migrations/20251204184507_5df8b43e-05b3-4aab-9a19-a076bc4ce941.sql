-- Adicionar colunas para resultado do laudo e data de finalização
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS neuro_final_diagnosis TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS neuro_completed_date DATE;