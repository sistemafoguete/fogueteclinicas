-- Sistema de Relatórios de Atendimentos
CREATE TABLE public.attendance_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id uuid REFERENCES schedules(id) NOT NULL,
  client_id uuid REFERENCES clients(id) NOT NULL,
  employee_id uuid NOT NULL,
  patient_name text NOT NULL,
  professional_name text NOT NULL,
  attendance_type text NOT NULL DEFAULT 'consultation',
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  session_duration integer, -- em minutos
  observations text,
  session_notes text,
  materials_used jsonb DEFAULT '[]'::jsonb,
  techniques_used text,
  patient_response text,
  next_session_plan text,
  status text NOT NULL DEFAULT 'completed',
  amount_charged numeric(10,2) DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Sistema Financeiro Automático
CREATE TABLE public.automatic_financial_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  origin_type text NOT NULL, -- 'attendance', 'contract', 'fee', 'monthly_payment', etc
  origin_id uuid, -- ID do registro de origem (schedule_id, contract_id, etc)
  patient_name text NOT NULL,
  patient_id uuid REFERENCES clients(id) NOT NULL,
  professional_name text,
  professional_id uuid,
  amount numeric(10,2) NOT NULL,
  payment_method text NOT NULL, -- 'cash', 'pix', 'credit_card', 'debit_card', 'bank_slip'
  transaction_type text NOT NULL DEFAULT 'income', -- 'income' ou 'expense'
  description text NOT NULL,
  payment_date timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  created_by_name text NOT NULL,
  attendance_report_id uuid REFERENCES attendance_reports(id),
  metadata jsonb DEFAULT '{}'::jsonb, -- dados extras específicos por tipo
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Histórico de Alterações Financeiras (Auditoria)
CREATE TABLE public.financial_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  financial_record_id uuid REFERENCES automatic_financial_records(id) NOT NULL,
  action text NOT NULL, -- 'created', 'updated', 'deleted'
  old_data jsonb,
  new_data jsonb,
  changed_by uuid NOT NULL,
  changed_by_name text NOT NULL,
  change_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Sistema de Permissões Granulares
CREATE TYPE permission_scope AS ENUM ('view', 'create', 'edit', 'delete');
CREATE TYPE system_module AS ENUM ('attendance', 'reports', 'financial', 'clients', 'users', 'settings');

CREATE TABLE public.role_module_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name text NOT NULL, -- 'ceo', 'coordinator', 'employee', 'intern'
  module_name system_module NOT NULL,
  permission_scope permission_scope NOT NULL,
  granted boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(role_name, module_name, permission_scope)
);

-- Adicionar campos necessários na tabela schedules
ALTER TABLE public.schedules 
ADD COLUMN IF NOT EXISTS session_amount numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS session_notes text,
ADD COLUMN IF NOT EXISTS materials_used jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS completed_by uuid;

-- Índices para performance
CREATE INDEX idx_attendance_reports_schedule_id ON attendance_reports(schedule_id);
CREATE INDEX idx_attendance_reports_client_id ON attendance_reports(client_id);
CREATE INDEX idx_attendance_reports_employee_id ON attendance_reports(employee_id);
CREATE INDEX idx_attendance_reports_created_at ON attendance_reports(created_at);

CREATE INDEX idx_financial_records_origin ON automatic_financial_records(origin_type, origin_id);
CREATE INDEX idx_financial_records_patient ON automatic_financial_records(patient_id);
CREATE INDEX idx_financial_records_professional ON automatic_financial_records(professional_id);
CREATE INDEX idx_financial_records_date ON automatic_financial_records(payment_date);
CREATE INDEX idx_financial_records_created_at ON automatic_financial_records(created_at);

-- Triggers para updated_at
CREATE TRIGGER update_attendance_reports_updated_at
  BEFORE UPDATE ON attendance_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_records_updated_at
  BEFORE UPDATE ON automatic_financial_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON role_module_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();