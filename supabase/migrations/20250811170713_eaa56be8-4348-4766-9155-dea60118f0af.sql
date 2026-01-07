-- Enable UUID generation
create extension if not exists pgcrypto;

-- Utility trigger to auto-update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Employees
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  username text,
  name text not null,
  role text not null,
  cpf text,
  phone text,
  email text,
  address text,
  instituicao text,
  graduation_period text,
  education text,
  disciplina text,
  tab_permissions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_employees_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

alter table public.employees enable row level security;
create policy "public_select_employees" on public.employees for select using (true);
create policy "public_insert_employees" on public.employees for insert with check (true);
create policy "public_update_employees" on public.employees for update using (true);
create policy "public_delete_employees" on public.employees for delete using (true);

-- Custom Roles for UI permissions
create table if not exists public.roles_custom (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  tab_permissions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_roles_custom_updated_at
before update on public.roles_custom
for each row execute function public.set_updated_at();

alter table public.roles_custom enable row level security;
create policy "public_select_roles_custom" on public.roles_custom for select using (true);
create policy "public_insert_roles_custom" on public.roles_custom for insert with check (true);
create policy "public_update_roles_custom" on public.roles_custom for update using (true);
create policy "public_delete_roles_custom" on public.roles_custom for delete using (true);

-- Clients
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cpf text,
  phone text,
  email text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

alter table public.clients enable row level security;
create policy "public_select_clients" on public.clients for select using (true);
create policy "public_insert_clients" on public.clients for insert with check (true);
create policy "public_update_clients" on public.clients for update using (true);
create policy "public_delete_clients" on public.clients for delete using (true);

-- Link between clients and professionals
create table if not exists public.client_professional_links (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.client_professional_links enable row level security;
create policy "public_select_cpl" on public.client_professional_links for select using (true);
create policy "public_insert_cpl" on public.client_professional_links for insert with check (true);
create policy "public_update_cpl" on public.client_professional_links for update using (true);
create policy "public_delete_cpl" on public.client_professional_links for delete using (true);

-- Appointments (Agenda)
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  assigned_employee_id uuid references public.employees(id),
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'scheduled',
  title text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_appointments_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

alter table public.appointments enable row level security;
create policy "public_select_appointments" on public.appointments for select using (true);
create policy "public_insert_appointments" on public.appointments for insert with check (true);
create policy "public_update_appointments" on public.appointments for update using (true);
create policy "public_delete_appointments" on public.appointments for delete using (true);

-- Meetings / Alerts
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  scheduled_at timestamptz not null,
  location text,
  attendee_employee_ids uuid[] not null default '{}',
  description text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_meetings_updated_at
before update on public.meetings
for each row execute function public.set_updated_at();

alter table public.meetings enable row level security;
create policy "public_select_meetings" on public.meetings for select using (true);
create policy "public_insert_meetings" on public.meetings for insert with check (true);
create policy "public_update_meetings" on public.meetings for update using (true);
create policy "public_delete_meetings" on public.meetings for delete using (true);

-- General documents (metadata; files in Storage)
create table if not exists public.general_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  doc_type text,
  file_path text not null,
  description text,
  uploaded_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_general_documents_updated_at
before update on public.general_documents
for each row execute function public.set_updated_at();

alter table public.general_documents enable row level security;
create policy "public_select_general_documents" on public.general_documents for select using (true);
create policy "public_insert_general_documents" on public.general_documents for insert with check (true);
create policy "public_update_general_documents" on public.general_documents for update using (true);
create policy "public_delete_general_documents" on public.general_documents for delete using (true);

-- General notes
create table if not exists public.general_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  note_type text not null,
  content text not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_general_notes_updated_at
before update on public.general_notes
for each row execute function public.set_updated_at();

alter table public.general_notes enable row level security;
create policy "public_select_general_notes" on public.general_notes for select using (true);
create policy "public_insert_general_notes" on public.general_notes for insert with check (true);
create policy "public_update_general_notes" on public.general_notes for update using (true);
create policy "public_delete_general_notes" on public.general_notes for delete using (true);

-- Financial entries (daily notes / movimentações)
create table if not exists public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  title text not null,
  type text not null,
  expense_category text,
  value numeric,
  content text,
  file_path text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_financial_entries_updated_at
before update on public.financial_entries
for each row execute function public.set_updated_at();

alter table public.financial_entries enable row level security;
create policy "public_select_financial_entries" on public.financial_entries for select using (true);
create policy "public_insert_financial_entries" on public.financial_entries for insert with check (true);
create policy "public_update_financial_entries" on public.financial_entries for update using (true);
create policy "public_delete_financial_entries" on public.financial_entries for delete using (true);

-- Storage buckets for files
insert into storage.buckets (id, name, public) values ('general', 'general', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Storage policies (open for now; tighten after auth)
create policy if not exists "Public read general"
  on storage.objects for select
  using (bucket_id = 'general');

create policy if not exists "Public upload general"
  on storage.objects for insert
  with check (bucket_id = 'general');

create policy if not exists "Public update general"
  on storage.objects for update
  using (bucket_id = 'general');

create policy if not exists "Public delete general"
  on storage.objects for delete
  using (bucket_id = 'general');

create policy if not exists "Public read documents"
  on storage.objects for select
  using (bucket_id = 'documents');

create policy if not exists "Public upload documents"
  on storage.objects for insert
  with check (bucket_id = 'documents');

create policy if not exists "Public update documents"
  on storage.objects for update
  using (bucket_id = 'documents');

create policy if not exists "Public delete documents"
  on storage.objects for delete
  using (bucket_id = 'documents');
