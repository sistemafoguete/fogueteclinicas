-- Create comprehensive clinical management tables

-- Employee time tracking table
CREATE TABLE IF NOT EXISTS public.employee_timesheet (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  clock_in TIMESTAMP WITH TIME ZONE,
  clock_out TIMESTAMP WITH TIME ZONE,
  break_start TIMESTAMP WITH TIME ZONE,
  break_end TIMESTAMP WITH TIME ZONE,
  total_hours NUMERIC(4,2),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  approved_by UUID,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (employee_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Medical records and session history
CREATE TABLE IF NOT EXISTS public.medical_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  session_date DATE NOT NULL,
  session_type TEXT NOT NULL,
  session_duration INTEGER, -- in minutes
  vital_signs JSONB DEFAULT '{}'::jsonb,
  symptoms TEXT,
  treatment_plan TEXT,
  medications JSONB DEFAULT '[]'::jsonb,
  progress_notes TEXT NOT NULL,
  next_appointment_notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Quality control and evaluation
CREATE TABLE IF NOT EXISTS public.quality_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  evaluator_id UUID NOT NULL,
  evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  service_quality_score INTEGER CHECK (service_quality_score >= 1 AND service_quality_score <= 10),
  communication_score INTEGER CHECK (communication_score >= 1 AND communication_score <= 10),
  punctuality_score INTEGER CHECK (punctuality_score >= 1 AND punctuality_score <= 10),
  professionalism_score INTEGER CHECK (professionalism_score >= 1 AND professionalism_score <= 10),
  overall_satisfaction INTEGER CHECK (overall_satisfaction >= 1 AND overall_satisfaction <= 10),
  comments TEXT,
  improvement_suggestions TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (evaluator_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Internal communication system
CREATE TABLE IF NOT EXISTS public.internal_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID,
  subject TEXT NOT NULL,
  message_body TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  message_type TEXT DEFAULT 'general' CHECK (message_type IN ('general', 'clinical', 'administrative', 'emergency')),
  is_read BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  parent_message_id UUID,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_message_id) REFERENCES public.internal_messages(id) ON DELETE CASCADE
);

-- System settings and configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_type TEXT DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS on all new tables
ALTER TABLE public.employee_timesheet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_timesheet
CREATE POLICY "Users can view their own timesheet" 
ON public.employee_timesheet 
FOR SELECT 
USING (auth.uid() = employee_id OR user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role]));

CREATE POLICY "Users can insert their own timesheet entries" 
ON public.employee_timesheet 
FOR INSERT 
WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Directors can manage all timesheets" 
ON public.employee_timesheet 
FOR ALL 
USING (user_has_role(ARRAY['director'::employee_role]));

-- RLS Policies for medical_records
CREATE POLICY "Healthcare staff can view medical records for assigned clients" 
ON public.medical_records 
FOR SELECT 
USING (
  user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
  OR
  EXISTS (
    SELECT 1 FROM client_assignments ca 
    WHERE ca.client_id = medical_records.client_id 
    AND ca.employee_id = auth.uid() 
    AND ca.is_active = true
  )
);

CREATE POLICY "Healthcare staff can create medical records for assigned clients" 
ON public.medical_records 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM client_assignments ca 
    WHERE ca.client_id = medical_records.client_id 
    AND ca.employee_id = auth.uid() 
    AND ca.is_active = true
  )
);

-- RLS Policies for quality_evaluations
CREATE POLICY "Directors and coordinators can manage quality evaluations" 
ON public.quality_evaluations 
FOR ALL 
USING (user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role]));

CREATE POLICY "Staff can view evaluations about them" 
ON public.quality_evaluations 
FOR SELECT 
USING (auth.uid() = employee_id);

-- RLS Policies for internal_messages
CREATE POLICY "Users can view messages sent to them or by them" 
ON public.internal_messages 
FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = recipient_id OR user_has_role(ARRAY['director'::employee_role]));

CREATE POLICY "Users can send messages" 
ON public.internal_messages 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages" 
ON public.internal_messages 
FOR UPDATE 
USING (auth.uid() = recipient_id OR auth.uid() = sender_id);

-- RLS Policies for system_settings
CREATE POLICY "Directors can manage system settings" 
ON public.system_settings 
FOR ALL 
USING (user_has_role(ARRAY['director'::employee_role]));

CREATE POLICY "Users can view public settings" 
ON public.system_settings 
FOR SELECT 
USING (is_public = true OR user_has_role(ARRAY['director'::employee_role]));

-- Insert default system settings
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
  ('clinic_name', 'Fundação Dom Bosco', 'string', 'Nome da clínica', true),
  ('clinic_address', '', 'string', 'Endereço da clínica', true),
  ('clinic_phone', '', 'string', 'Telefone da clínica', true),
  ('business_hours_start', '08:00', 'string', 'Horário de início', false),
  ('business_hours_end', '18:00', 'string', 'Horário de fim', false),
  ('appointment_duration_default', '60', 'number', 'Duração padrão das consultas (minutos)', false),
  ('max_appointments_per_day', '20', 'number', 'Máximo de agendamentos por dia', false),
  ('backup_frequency', 'daily', 'string', 'Frequência de backup', false)
ON CONFLICT (setting_key) DO NOTHING;