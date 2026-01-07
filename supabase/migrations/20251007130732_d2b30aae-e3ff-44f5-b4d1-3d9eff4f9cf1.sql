-- Atualizar política para permitir coordenadores criarem canais
DROP POLICY IF EXISTS "Directors can manage channels" ON public.channels;
DROP POLICY IF EXISTS "Users can view public channels" ON public.channels;

CREATE POLICY "Directors and coordinators can manage channels"
ON public.channels
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND employee_role IN ('director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role)
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND employee_role IN ('director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role)
    AND is_active = true
  )
);

CREATE POLICY "Users can view public channels or their channels"
ON public.channels
FOR SELECT
TO authenticated
USING (
  is_public = true 
  OR EXISTS (
    SELECT 1 FROM public.channel_members
    WHERE channel_id = channels.id
    AND user_id = auth.uid()
  )
);

-- Atualizar política de channel_members para coordenadores
DROP POLICY IF EXISTS "Directors can manage channel memberships" ON public.channel_members;
DROP POLICY IF EXISTS "Users can view their channel memberships" ON public.channel_members;

CREATE POLICY "Directors and coordinators can manage channel memberships"
ON public.channel_members
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND employee_role IN ('director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role)
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND employee_role IN ('director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role)
    AND is_active = true
  )
);

CREATE POLICY "Users can view their channel memberships"
ON public.channel_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- Atualizar política de mensagens para grupos
DROP POLICY IF EXISTS "Users can send messages" ON public.internal_messages;
DROP POLICY IF EXISTS "Users can update message read status" ON public.internal_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.internal_messages;
DROP POLICY IF EXISTS "Users can view messages" ON public.internal_messages;

CREATE POLICY "Users can send messages"
ON public.internal_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
);

CREATE POLICY "Users can update message read status"
ON public.internal_messages
FOR UPDATE
TO authenticated
USING (
  auth.uid() = recipient_id 
  OR auth.uid() = sender_id
  OR (
    channel_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.channel_members
      WHERE channel_id = internal_messages.channel_id
      AND user_id = auth.uid()
    )
  )
)
WITH CHECK (
  auth.uid() = recipient_id 
  OR auth.uid() = sender_id
  OR (
    channel_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.channel_members
      WHERE channel_id = internal_messages.channel_id
      AND user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can view their messages and channel messages"
ON public.internal_messages
FOR SELECT
TO authenticated
USING (
  auth.uid() = sender_id 
  OR auth.uid() = recipient_id 
  OR (
    channel_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.channel_members
      WHERE channel_id = internal_messages.channel_id
      AND user_id = auth.uid()
    )
  )
);