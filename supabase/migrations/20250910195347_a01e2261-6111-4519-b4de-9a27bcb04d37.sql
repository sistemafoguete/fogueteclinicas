-- Create channels table for organized conversations
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- Create policies for channels
CREATE POLICY "Users can view public channels" ON channels
  FOR SELECT USING (is_public = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Directors can manage channels" ON channels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND employee_role = 'director'
    )
  );

-- Create channel_members table
CREATE TABLE IF NOT EXISTS channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

-- Enable RLS
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;

-- Create policies for channel members
CREATE POLICY "Users can view their channel memberships" ON channel_members
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Directors can manage channel memberships" ON channel_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND employee_role = 'director'
    )
  );

-- Update internal_messages table to support channels
ALTER TABLE internal_messages ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES channels(id);
ALTER TABLE internal_messages ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES internal_messages(id);

-- Create user_presence table for online status
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'offline',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Create policies for user presence
CREATE POLICY "Users can view all user presence" ON user_presence
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own presence" ON user_presence
  FOR ALL USING (auth.uid() = user_id);

-- Create default general channel
INSERT INTO channels (name, description, is_public, created_by)
VALUES ('geral', 'Canal geral para toda a equipe', true, (SELECT user_id FROM profiles WHERE employee_role = 'director' LIMIT 1))
ON CONFLICT DO NOTHING;

-- Update RLS policies for internal_messages to support channels
DROP POLICY IF EXISTS "Users can send messages" ON internal_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON internal_messages;
DROP POLICY IF EXISTS "Users can view messages sent to them or by them" ON internal_messages;

CREATE POLICY "Users can send messages" ON internal_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND (
      -- Direct message
      (channel_id IS NULL AND recipient_id IS NOT NULL) OR
      -- Channel message (check membership)
      (channel_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM channel_members cm
        WHERE cm.channel_id = internal_messages.channel_id 
        AND cm.user_id = auth.uid()
      )) OR
      -- Public channel message
      (channel_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM channels c
        WHERE c.id = internal_messages.channel_id
        AND c.is_public = true
      ))
    )
  );

CREATE POLICY "Users can view messages" ON internal_messages
  FOR SELECT USING (
    -- Sender can view their messages
    auth.uid() = sender_id OR
    -- Recipient can view messages sent to them
    auth.uid() = recipient_id OR
    -- Channel members can view channel messages
    (channel_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM channel_members cm
      WHERE cm.channel_id = internal_messages.channel_id 
      AND cm.user_id = auth.uid()
    )) OR
    -- Anyone can view public channel messages
    (channel_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM channels c
      WHERE c.id = internal_messages.channel_id
      AND c.is_public = true
    )) OR
    -- Directors can view all messages
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND employee_role = 'director'
    )
  );

CREATE POLICY "Users can update their own messages" ON internal_messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE channels;
ALTER PUBLICATION supabase_realtime ADD TABLE channel_members;  
ALTER PUBLICATION supabase_realtime ADD TABLE internal_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;