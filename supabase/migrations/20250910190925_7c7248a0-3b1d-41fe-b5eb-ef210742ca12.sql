-- Create menu items table
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  role_required employee_role NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "All authenticated users can view active menu items" 
ON public.menu_items 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Directors can manage menu items" 
ON public.menu_items 
FOR ALL 
USING (user_has_role(ARRAY['director'::employee_role]));

-- Insert the current menu items
INSERT INTO public.menu_items (title, url, icon, order_index, role_required) VALUES
('Dashboard', '/dashboard', 'Home', 1, NULL),
('Cadastrar Cliente', '/client-form', 'UserPlus', 2, NULL),
('Lista de Clientes', '/clients', 'Users', 3, NULL),
('Agenda do Dia', '/schedule', 'Calendar', 4, NULL),
('Meus Pacientes', '/my-patients', 'UserCheck', 5, NULL),
('Meus Arquivos', '/my-files', 'FolderOpen', 6, NULL),
('Financeiro', '/financial', 'DollarSign', 7, NULL),
('Relatórios', '/reports', 'BarChart3', 8, NULL),
('Estoque', '/stock', 'Package', 9, NULL),
('Funcionários', '/employees', 'Users', 10, NULL),
('Cargos Customizados', '/custom-roles', 'Settings', 11, 'director');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_menu_items_updated_at
BEFORE UPDATE ON public.menu_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();