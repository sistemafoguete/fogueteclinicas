-- Create storage policies for user-documents bucket
-- Allow authenticated users to upload files to client-documents folder
CREATE POLICY "Users can upload client documents" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'user-documents' 
  AND (storage.foldername(name))[1] = 'client-documents'
  AND (
    -- Users can upload if they are assigned to the client
    EXISTS (
      SELECT 1 FROM client_assignments ca 
      WHERE ca.client_id::text = (storage.foldername(name))[2]
      AND ca.employee_id = auth.uid() 
      AND ca.is_active = true
    )
    -- Or if they are director/coordinator
    OR user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
  )
);

-- Allow users to view client documents they have access to
CREATE POLICY "Users can view client documents" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'user-documents' 
  AND (storage.foldername(name))[1] = 'client-documents'
  AND (
    -- Users can view if they are assigned to the client
    EXISTS (
      SELECT 1 FROM client_assignments ca 
      WHERE ca.client_id::text = (storage.foldername(name))[2]
      AND ca.employee_id = auth.uid() 
      AND ca.is_active = true
    )
    -- Or if they are director/coordinator
    OR user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
  )
);

-- Allow users to delete client documents they have access to
CREATE POLICY "Users can delete client documents" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'user-documents' 
  AND (storage.foldername(name))[1] = 'client-documents'
  AND (
    -- Users can delete if they are assigned to the client
    EXISTS (
      SELECT 1 FROM client_assignments ca 
      WHERE ca.client_id::text = (storage.foldername(name))[2]
      AND ca.employee_id = auth.uid() 
      AND ca.is_active = true
    )
    -- Or if they are director/coordinator
    OR user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
  )
);