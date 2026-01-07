-- Create storage buckets for different file types
INSERT INTO storage.buckets (id, name, public) VALUES
  ('user-documents', 'user-documents', false),
  ('reports', 'reports', false),
  ('templates', 'templates', true);

-- Create table to manage file metadata
CREATE TABLE public.user_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  mime_type TEXT,
  category TEXT DEFAULT 'document',
  description TEXT,
  is_private BOOLEAN DEFAULT true,
  tags TEXT[],
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;

-- Create policies for user files
CREATE POLICY "Users can view their own files" 
ON public.user_files 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own files" 
ON public.user_files 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files" 
ON public.user_files 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files" 
ON public.user_files 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Directors can view all files" 
ON public.user_files 
FOR SELECT 
USING (user_has_role(ARRAY['director'::employee_role]));

-- Create trigger for updated_at
CREATE TRIGGER update_user_files_updated_at
BEFORE UPDATE ON public.user_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for user-documents bucket
CREATE POLICY "Users can view their own documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'user-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'user-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'user-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'user-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for reports bucket
CREATE POLICY "Users can view their own reports" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own reports" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own reports" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own reports" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for templates bucket (public)
CREATE POLICY "Anyone can view templates" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'templates');

CREATE POLICY "Directors can manage templates" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'templates' AND user_has_role(ARRAY['director'::employee_role]));

-- Create file sharing table for collaboration
CREATE TABLE public.file_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES public.user_files(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level TEXT DEFAULT 'read' CHECK (permission_level IN ('read', 'write')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for file shares
ALTER TABLE public.file_shares ENABLE ROW LEVEL SECURITY;

-- Create policies for file sharing
CREATE POLICY "Users can view shares involving them" 
ON public.file_shares 
FOR SELECT 
USING (auth.uid() = shared_by OR auth.uid() = shared_with);

CREATE POLICY "Users can create shares for their files" 
ON public.file_shares 
FOR INSERT 
WITH CHECK (auth.uid() = shared_by);

CREATE POLICY "Users can delete their own shares" 
ON public.file_shares 
FOR DELETE 
USING (auth.uid() = shared_by);