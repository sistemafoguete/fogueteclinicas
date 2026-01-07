-- Criar tabela para vincular profissionais aos clientes
CREATE TABLE IF NOT EXISTS client_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(user_id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(client_id, employee_id)
);

-- Habilitar RLS
ALTER TABLE client_assignments ENABLE ROW LEVEL SECURITY;

-- Políticas para client_assignments
CREATE POLICY "Users can view their own assignments" 
ON client_assignments 
FOR SELECT 
USING (auth.uid() = employee_id OR user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role]));

CREATE POLICY "Coordinators can manage assignments" 
ON client_assignments 
FOR ALL 
USING (user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role]));

-- Criar tabela para notas dos clientes
CREATE TABLE IF NOT EXISTS client_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(user_id),
  note_text TEXT NOT NULL,
  note_type TEXT DEFAULT 'general',
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;

-- Políticas para client_notes
CREATE POLICY "Users can view notes for their clients" 
ON client_notes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM client_assignments ca 
    WHERE ca.client_id = client_notes.client_id 
    AND ca.employee_id = auth.uid() 
    AND ca.is_active = true
  ) OR user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
);

CREATE POLICY "Users can manage notes for their clients" 
ON client_notes 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM client_assignments ca 
    WHERE ca.client_id = client_notes.client_id 
    AND ca.employee_id = auth.uid() 
    AND ca.is_active = true
  ) OR user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
);

-- Criar tabela para documentos dos clientes
CREATE TABLE IF NOT EXISTS client_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES profiles(user_id),
  document_name TEXT NOT NULL,
  document_type TEXT,
  file_path TEXT,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Habilitar RLS
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;

-- Políticas para client_documents
CREATE POLICY "Users can view documents for their clients" 
ON client_documents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM client_assignments ca 
    WHERE ca.client_id = client_documents.client_id 
    AND ca.employee_id = auth.uid() 
    AND ca.is_active = true
  ) OR user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
);

CREATE POLICY "Users can manage documents for their clients" 
ON client_documents 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM client_assignments ca 
    WHERE ca.client_id = client_documents.client_id 
    AND ca.employee_id = auth.uid() 
    AND ca.is_active = true
  ) OR user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
);

-- Adicionar colunas extras na tabela clients
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS responsible_name TEXT,
ADD COLUMN IF NOT EXISTS responsible_phone TEXT,
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'madre',
ADD COLUMN IF NOT EXISTS diagnosis TEXT,
ADD COLUMN IF NOT EXISTS neuropsych_complaint TEXT,
ADD COLUMN IF NOT EXISTS treatment_expectations TEXT,
ADD COLUMN IF NOT EXISTS clinical_observations TEXT;

-- Triggers para updated_at
CREATE TRIGGER update_client_notes_updated_at
BEFORE UPDATE ON client_notes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();