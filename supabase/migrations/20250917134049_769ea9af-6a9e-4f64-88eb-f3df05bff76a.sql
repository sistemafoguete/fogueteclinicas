-- Criar tabela de relatórios de funcionários
CREATE TABLE employee_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session_type TEXT NOT NULL,
  session_duration INTEGER, -- em minutos
  
  -- Avaliações profissionais
  effort_rating INTEGER CHECK (effort_rating >= 1 AND effort_rating <= 5),
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  patient_cooperation INTEGER CHECK (patient_cooperation >= 1 AND patient_cooperation <= 5),
  goal_achievement INTEGER CHECK (goal_achievement >= 1 AND goal_achievement <= 5),
  
  -- Observações profissionais
  session_objectives TEXT,
  techniques_used TEXT,
  patient_response TEXT,
  professional_notes TEXT,
  next_session_plan TEXT,
  
  -- Materiais utilizados
  materials_used JSONB DEFAULT '[]'::jsonb,
  materials_cost NUMERIC DEFAULT 0,
  
  -- Dados adicionais
  session_location TEXT,
  supervision_required BOOLEAN DEFAULT false,
  follow_up_needed BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE employee_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Directors can manage all employee reports"
ON employee_reports
FOR ALL
TO authenticated
USING (user_has_role(ARRAY['director'::employee_role]));

CREATE POLICY "Coordinators can view reports"
ON employee_reports  
FOR SELECT
TO authenticated
USING (user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role]));

CREATE POLICY "Users can view their own reports"
ON employee_reports
FOR SELECT  
TO authenticated
USING (auth.uid() = employee_id);

CREATE POLICY "Users can create their own reports"
ON employee_reports
FOR INSERT
TO authenticated  
WITH CHECK (auth.uid() = employee_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_employee_reports_updated_at
  BEFORE UPDATE ON employee_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Adicionar campos para armazenar dados do atendimento no cliente
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_session_notes TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_session_date DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_session_type TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS treatment_progress TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS current_symptoms TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS current_medications JSONB DEFAULT '[]'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS vital_signs_history JSONB DEFAULT '[]'::jsonb;