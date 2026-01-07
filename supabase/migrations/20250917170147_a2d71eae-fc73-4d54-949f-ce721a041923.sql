-- Criar bucket para documentos de atendimento
INSERT INTO storage.buckets (id, name, public) 
VALUES ('attendance-documents', 'attendance-documents', false);

-- Políticas para o bucket attendance-documents
CREATE POLICY "Users can upload attendance documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'attendance-documents' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their attendance documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'attendance-documents' 
  AND auth.uid() IS NOT NULL
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
  )
);

CREATE POLICY "Users can delete their attendance documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'attendance-documents' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Adicionar campo attachments às tabelas de relatórios
ALTER TABLE attendance_reports 
ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;

ALTER TABLE employee_reports 
ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN attendance_reports.attachments IS 'Array de objetos com informações dos documentos anexados: {name, path, size, type}';
COMMENT ON COLUMN employee_reports.attachments IS 'Array de objetos com informações dos documentos anexados: {name, path, size, type}';