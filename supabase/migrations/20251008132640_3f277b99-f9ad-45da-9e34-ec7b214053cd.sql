-- Remover constraint antiga de status
ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS schedules_status_check;

-- Adicionar nova constraint incluindo pending_validation
ALTER TABLE public.schedules ADD CONSTRAINT schedules_status_check 
CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'pending_validation'));

-- Comentário explicativo
COMMENT ON CONSTRAINT schedules_status_check ON public.schedules IS 
'Status permitidos: scheduled (agendado), confirmed (confirmado), completed (concluído validado), cancelled (cancelado), pending_validation (aguardando validação do coordenador)';