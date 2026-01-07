-- Verificar se a tabela stock_movements existe, e criá-la se necessário
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('in', 'out')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(10,2) DEFAULT 0,
  total_cost NUMERIC(10,2) DEFAULT 0,
  reason TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para stock_movements
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para stock_movements
DROP POLICY IF EXISTS "Staff can view stock movements" ON public.stock_movements;
CREATE POLICY "Staff can view stock movements" 
ON public.stock_movements FOR SELECT 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Stock managers can manage movements" ON public.stock_movements;
CREATE POLICY "Stock managers can manage movements" 
ON public.stock_movements FOR ALL 
USING (user_has_role(ARRAY['director'::employee_role, 'financeiro'::employee_role]))
WITH CHECK (user_has_role(ARRAY['director'::employee_role, 'financeiro'::employee_role]));

-- Adicionar campos que podem estar faltando na tabela stock_items
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS barcode TEXT;

-- Garantir que a tabela stock_items tenha RLS habilitado com as políticas corretas
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;

-- Política para visualizar itens de estoque
DROP POLICY IF EXISTS "Staff can view stock items" ON public.stock_items;
CREATE POLICY "Staff can view stock items" 
ON public.stock_items FOR SELECT 
USING (is_active = true AND auth.uid() IS NOT NULL);

-- Política para gerenciar itens de estoque
DROP POLICY IF EXISTS "Stock managers can manage items" ON public.stock_items;
CREATE POLICY "Stock managers can manage items" 
ON public.stock_items FOR ALL 
USING (user_has_role(ARRAY['director'::employee_role, 'financeiro'::employee_role]))
WITH CHECK (user_has_role(ARRAY['director'::employee_role, 'financeiro'::employee_role]));

-- Função para atualizar o updated_at automaticamente
CREATE OR REPLACE FUNCTION update_stock_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at na tabela stock_items
DROP TRIGGER IF EXISTS update_stock_items_updated_at ON public.stock_items;
CREATE TRIGGER update_stock_items_updated_at
  BEFORE UPDATE ON public.stock_items
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_updated_at();

-- Trigger para atualizar updated_at na tabela stock_movements
DROP TRIGGER IF EXISTS update_stock_movements_updated_at ON public.stock_movements;
CREATE TRIGGER update_stock_movements_updated_at
  BEFORE UPDATE ON public.stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_updated_at();