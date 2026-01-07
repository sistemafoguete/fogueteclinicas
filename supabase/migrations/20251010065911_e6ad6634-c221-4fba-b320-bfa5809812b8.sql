-- Habilitar realtime na tabela meeting_alerts
ALTER TABLE public.meeting_alerts REPLICA IDENTITY FULL;

-- Adicionar tabela à publicação realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_alerts;

-- Comentário
COMMENT ON TABLE public.meeting_alerts IS 'Tabela com realtime habilitado para notificações de reuniões';