-- Remove menu items de configurações e auditoria
DELETE FROM menu_items WHERE title IN ('Configurações', 'Auditoria');

-- Update sistema de notificações para meeting alerts
CREATE TABLE IF NOT EXISTS meeting_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  meeting_date TIMESTAMP WITH TIME ZONE NOT NULL,
  meeting_location TEXT,
  meeting_room TEXT,
  client_id UUID REFERENCES clients(id),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  participants UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE meeting_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for meeting alerts
CREATE POLICY "Directors and coordinators can manage meeting alerts" ON meeting_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND employee_role IN ('director', 'coordinator_madre', 'coordinator_floresta')
    )
  );

CREATE POLICY "Users can view alerts for them" ON meeting_alerts
  FOR SELECT USING (
    auth.uid() = ANY(participants) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND employee_role IN ('director', 'coordinator_madre', 'coordinator_floresta')
    )
  );