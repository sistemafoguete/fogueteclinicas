-- Adicionar campos para distinguir quem atendeu e quem concluiu o atendimento
ALTER TABLE public.attendance_reports 
ADD COLUMN completed_by uuid REFERENCES auth.users(id);

ALTER TABLE public.attendance_reports 
ADD COLUMN completed_by_name text;

ALTER TABLE public.employee_reports 
ADD COLUMN completed_by uuid REFERENCES auth.users(id);

ALTER TABLE public.employee_reports 
ADD COLUMN completed_by_name text;

ALTER TABLE public.automatic_financial_records 
ADD COLUMN completed_by uuid REFERENCES auth.users(id);

ALTER TABLE public.automatic_financial_records 
ADD COLUMN completed_by_name text;

-- Comentários para clarificar os campos
COMMENT ON COLUMN public.attendance_reports.employee_id IS 'Profissional designado para o atendimento';
COMMENT ON COLUMN public.attendance_reports.completed_by IS 'Usuário que concluiu/finalizou o atendimento';
COMMENT ON COLUMN public.employee_reports.employee_id IS 'Profissional designado para o atendimento';
COMMENT ON COLUMN public.employee_reports.completed_by IS 'Usuário que concluiu/finalizou o atendimento';