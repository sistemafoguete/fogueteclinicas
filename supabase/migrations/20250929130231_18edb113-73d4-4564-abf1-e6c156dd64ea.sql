-- Criar bucket para documentos de estoque
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stock-documents', 
  'stock-documents', 
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/heic', 'image/heif']
);

-- Criar tabela para gerenciar anexos de itens de estoque
CREATE TABLE IF NOT EXISTS public.stock_item_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_item_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  document_type TEXT DEFAULT 'invoice', -- 'invoice', 'receipt', 'warranty', 'manual', 'other'
  uploaded_by UUID,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.stock_item_attachments ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para anexos de estoque
CREATE POLICY "Directors can manage stock attachments" 
ON public.stock_item_attachments 
FOR ALL 
USING (user_has_role(ARRAY['director'::employee_role]))
WITH CHECK (user_has_role(ARRAY['director'::employee_role]));

CREATE POLICY "Stock managers can view and add attachments" 
ON public.stock_item_attachments 
FOR ALL 
USING (can_manage_stock())
WITH CHECK (can_manage_stock());

-- Políticas de storage para documentos de estoque
CREATE POLICY "Directors can manage stock documents" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'stock-documents' AND user_has_role(ARRAY['director'::employee_role]))
WITH CHECK (bucket_id = 'stock-documents' AND user_has_role(ARRAY['director'::employee_role]));

CREATE POLICY "Stock managers can upload and view stock documents" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'stock-documents' AND can_manage_stock())
WITH CHECK (bucket_id = 'stock-documents' AND can_manage_stock());