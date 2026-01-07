-- Adicionar campo para guardar quem fez a suspeita de diagnóstico
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS neuro_diagnosis_by text;