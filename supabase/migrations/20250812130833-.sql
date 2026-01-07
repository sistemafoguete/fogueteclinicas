-- 1) Create roles enum and user_roles table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'coordinator', 'professional', 'intern', 'finance', 'user');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security helper functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.user_roles_is_empty()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select count(*) = 0 from public.user_roles;
$$;

-- RLS policies for user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Bootstrap first admin" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Bootstrap policy to allow first authenticated user to self-assign admin once
CREATE POLICY "Bootstrap first admin"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_roles_is_empty() AND role = 'admin' AND user_id = auth.uid()
);

-- 2) Harden set_updated_at function (set search_path)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3) Lock down RLS on existing tables
-- Appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS public_delete_appointments ON public.appointments;
DROP POLICY IF EXISTS public_insert_appointments ON public.appointments;
DROP POLICY IF EXISTS public_select_appointments ON public.appointments;
DROP POLICY IF EXISTS public_update_appointments ON public.appointments;

CREATE POLICY "appointments_select_authenticated"
ON public.appointments
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "appointments_admin_writes"
ON public.appointments
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "appointments_admin_update"
ON public.appointments
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "appointments_admin_delete"
ON public.appointments
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Client-professional links
ALTER TABLE public.client_professional_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS public_delete_cpl ON public.client_professional_links;
DROP POLICY IF EXISTS public_insert_cpl ON public.client_professional_links;
DROP POLICY IF EXISTS public_select_cpl ON public.client_professional_links;
DROP POLICY IF EXISTS public_update_cpl ON public.client_professional_links;

CREATE POLICY "cpl_select_authenticated"
ON public.client_professional_links
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "cpl_admin_writes"
ON public.client_professional_links
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "cpl_admin_update"
ON public.client_professional_links
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "cpl_admin_delete"
ON public.client_professional_links
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS public_delete_clients ON public.clients;
DROP POLICY IF EXISTS public_insert_clients ON public.clients;
DROP POLICY IF EXISTS public_select_clients ON public.clients;
DROP POLICY IF EXISTS public_update_clients ON public.clients;

CREATE POLICY "clients_select_authenticated"
ON public.clients
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "clients_admin_writes"
ON public.clients
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "clients_admin_update"
ON public.clients
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "clients_admin_delete"
ON public.clients
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Employees
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS public_delete_employees ON public.employees;
DROP POLICY IF EXISTS public_insert_employees ON public.employees;
DROP POLICY IF EXISTS public_select_employees ON public.employees;
DROP POLICY IF EXISTS public_update_employees ON public.employees;

CREATE POLICY "employees_select_authenticated"
ON public.employees
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "employees_admin_writes"
ON public.employees
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "employees_admin_update"
ON public.employees
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "employees_admin_delete"
ON public.employees
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Financial entries (sensitive)
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS public_delete_financial_entries ON public.financial_entries;
DROP POLICY IF EXISTS public_insert_financial_entries ON public.financial_entries;
DROP POLICY IF EXISTS public_select_financial_entries ON public.financial_entries;
DROP POLICY IF EXISTS public_update_financial_entries ON public.financial_entries;

CREATE POLICY "financial_select_owner_or_admin"
ON public.financial_entries
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

CREATE POLICY "financial_insert_owner_or_admin"
ON public.financial_entries
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

CREATE POLICY "financial_update_owner_or_admin"
ON public.financial_entries
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

CREATE POLICY "financial_delete_owner_or_admin"
ON public.financial_entries
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

-- General documents
ALTER TABLE public.general_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS public_delete_general_documents ON public.general_documents;
DROP POLICY IF EXISTS public_insert_general_documents ON public.general_documents;
DROP POLICY IF EXISTS public_select_general_documents ON public.general_documents;
DROP POLICY IF EXISTS public_update_general_documents ON public.general_documents;

CREATE POLICY "general_docs_select_owner_or_admin"
ON public.general_documents
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR uploaded_by = auth.uid());

CREATE POLICY "general_docs_insert_owner_or_admin"
ON public.general_documents
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR uploaded_by = auth.uid());

CREATE POLICY "general_docs_update_owner_or_admin"
ON public.general_documents
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR uploaded_by = auth.uid());

CREATE POLICY "general_docs_delete_owner_or_admin"
ON public.general_documents
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR uploaded_by = auth.uid());

-- General notes
ALTER TABLE public.general_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS public_delete_general_notes ON public.general_notes;
DROP POLICY IF EXISTS public_insert_general_notes ON public.general_notes;
DROP POLICY IF EXISTS public_select_general_notes ON public.general_notes;
DROP POLICY IF EXISTS public_update_general_notes ON public.general_notes;

CREATE POLICY "notes_select_owner_or_admin"
ON public.general_notes
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

CREATE POLICY "notes_insert_owner_or_admin"
ON public.general_notes
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

CREATE POLICY "notes_update_owner_or_admin"
ON public.general_notes
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

CREATE POLICY "notes_delete_owner_or_admin"
ON public.general_notes
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

-- Meetings
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS public_delete_meetings ON public.meetings;
DROP POLICY IF EXISTS public_insert_meetings ON public.meetings;
DROP POLICY IF EXISTS public_select_meetings ON public.meetings;
DROP POLICY IF EXISTS public_update_meetings ON public.meetings;

CREATE POLICY "meetings_select_authenticated"
ON public.meetings
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "meetings_insert_owner_or_admin"
ON public.meetings
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

CREATE POLICY "meetings_update_owner_or_admin"
ON public.meetings
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

CREATE POLICY "meetings_delete_owner_or_admin"
ON public.meetings
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

-- roles_custom
ALTER TABLE public.roles_custom ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS public_delete_roles_custom ON public.roles_custom;
DROP POLICY IF EXISTS public_insert_roles_custom ON public.roles_custom;
DROP POLICY IF EXISTS public_select_roles_custom ON public.roles_custom;
DROP POLICY IF EXISTS public_update_roles_custom ON public.roles_custom;

CREATE POLICY "roles_custom_select_admin"
ON public.roles_custom
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "roles_custom_admin_writes"
ON public.roles_custom
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) Storage: make 'general' private and add strict policies
UPDATE storage.buckets SET public = false WHERE id = 'general';

-- Drop any existing policies on storage.objects that might be too permissive
-- Note: We don't know names; create uniquely named ones we need

CREATE POLICY IF NOT EXISTS "storage_general_select_owner_or_admin"
ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'general' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY IF NOT EXISTS "storage_general_insert_owner"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'general' AND owner = auth.uid());

CREATE POLICY IF NOT EXISTS "storage_general_update_owner_or_admin"
ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'general' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY IF NOT EXISTS "storage_general_delete_owner_or_admin"
ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'general' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY IF NOT EXISTS "storage_documents_select_owner_or_admin"
ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'documents' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY IF NOT EXISTS "storage_documents_insert_owner"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND owner = auth.uid());

CREATE POLICY IF NOT EXISTS "storage_documents_update_owner_or_admin"
ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'documents' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY IF NOT EXISTS "storage_documents_delete_owner_or_admin"
ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));
