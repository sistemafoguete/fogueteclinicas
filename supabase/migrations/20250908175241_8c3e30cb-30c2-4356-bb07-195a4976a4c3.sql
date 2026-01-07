-- Create complete database structure for Fundação Dom Bosco system

-- Clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cpf TEXT,
  rg TEXT,
  birth_date DATE,
  address TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  medical_history TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Anamnesis types table  
CREATE TABLE public.anamnesis_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Schedules/Appointments table
CREATE TABLE public.schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.profiles(id),
  anamnesis_type_id UUID REFERENCES public.anamnesis_types(id),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  location TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Financial records table
CREATE TABLE public.financial_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  client_id UUID REFERENCES public.clients(id),
  employee_id UUID REFERENCES public.profiles(id),
  payment_method TEXT,
  invoice_number TEXT,
  notes TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Stock items table
CREATE TABLE public.stock_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit TEXT DEFAULT 'unit',
  current_quantity INTEGER DEFAULT 0,
  minimum_quantity INTEGER DEFAULT 0,
  unit_cost DECIMAL(10,2) DEFAULT 0,
  supplier TEXT,
  location TEXT,
  barcode TEXT,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Stock movements table
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  reason TEXT,
  reference_document TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  file_type TEXT,
  file_size INTEGER,
  category TEXT,
  client_id UUID REFERENCES public.clients(id),
  employee_id UUID REFERENCES public.profiles(id),
  is_public BOOLEAN DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
  user_id UUID REFERENCES auth.users(id),
  is_read BOOLEAN DEFAULT false,
  is_global BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notes table (general notes system)
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT,
  client_id UUID REFERENCES public.clients(id),
  employee_id UUID REFERENCES public.profiles(id),
  is_private BOOLEAN DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamnesis_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Create updated_at triggers for all tables
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at
  BEFORE UPDATE ON public.schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_records_updated_at
  BEFORE UPDATE ON public.financial_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stock_items_updated_at
  BEFORE UPDATE ON public.stock_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for Clients
CREATE POLICY "Directors can manage all clients" ON public.clients
  FOR ALL USING (public.user_has_role(ARRAY['director'::employee_role]));

CREATE POLICY "Coordinators can manage clients" ON public.clients
  FOR ALL USING (public.user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role]));

CREATE POLICY "Staff can view clients" ON public.clients
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS Policies for Anamnesis Types
CREATE POLICY "All authenticated users can view anamnesis types" ON public.anamnesis_types
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Directors can manage anamnesis types" ON public.anamnesis_types
  FOR ALL USING (public.user_has_role(ARRAY['director'::employee_role]));

-- RLS Policies for Schedules
CREATE POLICY "Directors can manage all schedules" ON public.schedules
  FOR ALL USING (public.user_has_role(ARRAY['director'::employee_role]));

CREATE POLICY "Coordinators can manage schedules" ON public.schedules
  FOR ALL USING (public.user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role]));

CREATE POLICY "Staff can view and create schedules" ON public.schedules
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can insert schedules" ON public.schedules
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for Financial Records
CREATE POLICY "Directors can manage all financial records" ON public.financial_records
  FOR ALL USING (public.user_has_role(ARRAY['director'::employee_role]));

CREATE POLICY "Finance staff can manage financial records" ON public.financial_records
  FOR ALL USING (public.user_has_role(ARRAY['director'::employee_role, 'finance'::employee_role]));

-- RLS Policies for Stock
CREATE POLICY "Directors can manage all stock items" ON public.stock_items
  FOR ALL USING (public.user_has_role(ARRAY['director'::employee_role]));

CREATE POLICY "Staff can view stock items" ON public.stock_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Directors can manage stock movements" ON public.stock_movements
  FOR ALL USING (public.user_has_role(ARRAY['director'::employee_role]));

CREATE POLICY "Staff can view stock movements" ON public.stock_movements
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can create stock movements" ON public.stock_movements
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for Documents
CREATE POLICY "Directors can manage all documents" ON public.documents
  FOR ALL USING (public.user_has_role(ARRAY['director'::employee_role]));

CREATE POLICY "Users can view public documents" ON public.documents
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_public = true);

CREATE POLICY "Users can manage their own documents" ON public.documents
  FOR ALL USING (auth.uid() = created_by);

-- RLS Policies for Notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id OR is_global = true);

CREATE POLICY "Directors can manage all notifications" ON public.notifications
  FOR ALL USING (public.user_has_role(ARRAY['director'::employee_role]));

-- RLS Policies for Notes
CREATE POLICY "Directors can manage all notes" ON public.notes
  FOR ALL USING (public.user_has_role(ARRAY['director'::employee_role]));

CREATE POLICY "Users can manage their own notes" ON public.notes
  FOR ALL USING (auth.uid() = created_by);

CREATE POLICY "Users can view non-private notes" ON public.notes
  FOR SELECT USING (auth.uid() IS NOT NULL AND (is_private = false OR created_by = auth.uid()));

-- Insert sample anamnesis types
INSERT INTO public.anamnesis_types (name, description) VALUES
('Avaliação Inicial', 'Primeira consulta para avaliação geral'),
('Fisioterapia', 'Sessão de fisioterapia'),
('Psicologia', 'Atendimento psicológico'),
('Fonoaudiologia', 'Terapia da fala'),
('Terapia Ocupacional', 'Sessão de terapia ocupacional'),
('Consulta Médica', 'Consulta com médico especialista'),
('Grupo Terapêutico', 'Sessão em grupo'),
('Reavaliação', 'Reavaliação de progresso');

-- Insert sample stock categories and items
INSERT INTO public.stock_items (name, description, category, unit, current_quantity, minimum_quantity, unit_cost) VALUES
('Papel A4', 'Papel sulfite A4 75g', 'Material de Escritório', 'resma', 50, 10, 25.90),
('Caneta Azul', 'Caneta esferográfica azul', 'Material de Escritório', 'unidade', 100, 20, 1.50),
('Álcool Gel', 'Álcool em gel 70%', 'Higiene', 'frasco', 30, 5, 8.90),
('Luvas Descartáveis', 'Luvas de procedimento', 'EPI', 'caixa', 15, 3, 45.00),
('Termômetro Digital', 'Termômetro clínico digital', 'Equipamento Médico', 'unidade', 5, 2, 85.00),
('Máscara Cirúrgica', 'Máscara descartável tripla camada', 'EPI', 'caixa', 25, 5, 35.00);

-- Create test director user (this will be created when someone signs up with this email)
-- The actual user creation will happen through the signup process