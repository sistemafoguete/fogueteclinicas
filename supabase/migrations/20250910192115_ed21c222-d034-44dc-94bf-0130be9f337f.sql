-- Create sessions table for tracking appointments
CREATE TABLE IF NOT EXISTS public.appointment_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL,
  session_number INTEGER NOT NULL DEFAULT 1,
  materials_used JSONB DEFAULT '[]'::jsonb,
  total_materials_cost NUMERIC(10,2) DEFAULT 0,
  session_notes TEXT,
  session_duration INTEGER, -- in minutes
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  FOREIGN KEY (schedule_id) REFERENCES public.schedules(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.appointment_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for appointment_sessions
CREATE POLICY "Users can view sessions for their appointments" 
ON public.appointment_sessions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM schedules s 
    WHERE s.id = appointment_sessions.schedule_id 
    AND (s.employee_id = auth.uid() OR user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role]))
  )
);

CREATE POLICY "Users can create sessions for their appointments" 
ON public.appointment_sessions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM schedules s 
    WHERE s.id = appointment_sessions.schedule_id 
    AND (s.employee_id = auth.uid() OR user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role]))
  )
);

CREATE POLICY "Directors can manage all sessions" 
ON public.appointment_sessions 
FOR ALL 
USING (user_has_role(ARRAY['director'::employee_role]));

-- Add client information to stock_movements for better tracking
ALTER TABLE public.stock_movements 
ADD COLUMN IF NOT EXISTS client_id UUID,
ADD COLUMN IF NOT EXISTS schedule_id UUID,
ADD COLUMN IF NOT EXISTS session_number INTEGER DEFAULT 1;

-- Add foreign keys
ALTER TABLE public.stock_movements 
ADD CONSTRAINT fk_stock_movements_client 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_stock_movements_schedule 
FOREIGN KEY (schedule_id) REFERENCES public.schedules(id) ON DELETE SET NULL;