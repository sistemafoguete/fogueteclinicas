-- Adicionar colunas para controle de inscrições nas reuniões
ALTER TABLE public.meeting_alerts 
ADD COLUMN IF NOT EXISTS max_participants INTEGER,
ADD COLUMN IF NOT EXISTS is_open_enrollment BOOLEAN DEFAULT true;