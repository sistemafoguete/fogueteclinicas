-- Corrigir tabela user_sessions para permitir upsert corretamente
DROP INDEX IF EXISTS idx_user_sessions_user_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions (user_id);

-- Verificar e corrigir políticas de mensagens
DROP POLICY IF EXISTS "Users can send messages" ON public.internal_messages;
DROP POLICY IF EXISTS "Users can view messages" ON public.internal_messages;

-- Política mais simples para envio de mensagens
CREATE POLICY "Users can send messages" 
ON public.internal_messages 
FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() = sender_id
);

-- Política mais simples para visualizar mensagens
CREATE POLICY "Users can view messages" 
ON public.internal_messages 
FOR SELECT 
TO authenticated 
USING (
  -- Pode ver mensagens que enviou
  auth.uid() = sender_id OR
  -- Pode ver mensagens que recebeu
  auth.uid() = recipient_id OR
  -- Pode ver mensagens de canais públicos
  (channel_id IS NOT NULL)
);

-- Política para update de mensagens (marcar como lida)
CREATE POLICY "Users can update message read status" 
ON public.internal_messages 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = recipient_id OR auth.uid() = sender_id)
WITH CHECK (auth.uid() = recipient_id OR auth.uid() = sender_id);

-- Habilitar realtime nas tabelas de mensagens
ALTER TABLE public.internal_messages REPLICA IDENTITY FULL;
ALTER TABLE public.channels REPLICA IDENTITY FULL;

-- Verificar se os canais têm o created_by correto
UPDATE public.channels 
SET created_by = (SELECT user_id FROM profiles WHERE employee_role = 'director' LIMIT 1)
WHERE created_by IS NULL OR NOT EXISTS (
  SELECT 1 FROM profiles WHERE user_id = channels.created_by
);