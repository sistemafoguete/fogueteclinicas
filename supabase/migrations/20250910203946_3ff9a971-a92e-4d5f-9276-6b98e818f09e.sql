-- Criar canais básicos se não existirem
INSERT INTO public.channels (name, description, is_public, created_by)
SELECT 'geral', 'Canal geral de conversas', true, 
       (SELECT user_id FROM profiles WHERE employee_role = 'director' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE name = 'geral');

INSERT INTO public.channels (name, description, is_public, created_by)
SELECT 'avisos', 'Canal para avisos importantes', true,
       (SELECT user_id FROM profiles WHERE employee_role = 'director' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE name = 'avisos');

-- Corrigir política RLS para internal_messages (simplificar a validação)
DROP POLICY IF EXISTS "Users can send messages" ON public.internal_messages;

CREATE POLICY "Users can send messages" 
ON public.internal_messages 
FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() = sender_id AND 
  (
    -- Para mensagens em canais públicos
    (channel_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM channels c WHERE c.id = channel_id AND c.is_public = true
    )) OR
    -- Para mensagens diretas
    (channel_id IS NULL AND recipient_id IS NOT NULL)
  )
);

-- Adicionar política mais simples para SELECT
DROP POLICY IF EXISTS "Users can view messages" ON public.internal_messages;

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
  (channel_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM channels c WHERE c.id = channel_id AND c.is_public = true
  )) OR
  -- Diretores podem ver tudo
  (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'director'))
);