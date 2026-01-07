-- Check storage policies for user-documents bucket
SELECT policyname, cmd, qual FROM storage.objects_policies WHERE bucket_id = 'user-documents';