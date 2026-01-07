-- Enable realtime for internal_messages table
ALTER TABLE public.internal_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_messages;

-- Enable realtime for user_presence table  
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;