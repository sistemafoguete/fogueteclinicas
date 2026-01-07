-- Temporarily allow directors full access to storage for debugging
DROP POLICY IF EXISTS "Users can upload client documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view client documents" ON storage.objects;  
DROP POLICY IF EXISTS "Users can delete client documents" ON storage.objects;

-- Create simpler policy for directors to upload documents
CREATE POLICY "Directors and coordinators can upload client documents" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'user-documents' 
  AND (storage.foldername(name))[1] = 'client-documents'
  AND user_has_any_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
);

-- Create policy for directors to view documents
CREATE POLICY "Directors and coordinators can view client documents" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'user-documents' 
  AND (storage.foldername(name))[1] = 'client-documents'
  AND user_has_any_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
);

-- Create policy for directors to delete documents  
CREATE POLICY "Directors and coordinators can delete client documents" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'user-documents' 
  AND (storage.foldername(name))[1] = 'client-documents'
  AND user_has_any_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
);