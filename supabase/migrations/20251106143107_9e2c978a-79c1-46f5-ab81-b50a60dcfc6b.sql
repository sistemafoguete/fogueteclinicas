-- Verificar se o bucket user-documents existe e criar políticas de storage corretas
-- Criar bucket se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-documents', 'user-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Staff can upload documents for assigned clients" ON storage.objects;
DROP POLICY IF EXISTS "Staff can view documents of assigned clients" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete documents of assigned clients" ON storage.objects;

-- Criar política para visualizar documentos
CREATE POLICY "Staff can view documents of assigned clients"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'user-documents' AND (
    (EXISTS (
      SELECT 1 FROM client_documents cd
      JOIN client_assignments ca ON ca.client_id = cd.client_id
      WHERE cd.file_path = storage.objects.name
        AND ca.employee_id = auth.uid()
        AND ca.is_active = true
    ))
    OR director_has_god_mode()
  )
);

-- Criar política para fazer upload de documentos
CREATE POLICY "Staff can upload documents for assigned clients"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'user-documents' AND (
    (auth.uid() IS NOT NULL)
    OR director_has_god_mode()
  )
);

-- Criar política para deletar documentos
CREATE POLICY "Staff can delete documents of assigned clients"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'user-documents' AND (
    (EXISTS (
      SELECT 1 FROM client_documents cd
      JOIN client_assignments ca ON ca.client_id = cd.client_id
      WHERE cd.file_path = storage.objects.name
        AND ca.employee_id = auth.uid()
        AND ca.is_active = true
    ))
    OR director_has_god_mode()
  )
);