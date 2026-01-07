-- Criar função para verificar se usuário é diretor (bypass total)
CREATE OR REPLACE FUNCTION public.is_god_mode_director()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = 'director'::employee_role
  );
$$;

-- Atualizar todas as políticas para dar acesso total ao diretor
-- Política universal para clientes
CREATE POLICY "Directors have full access to clients" 
ON public.clients 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

-- Política universal para funcionários
CREATE POLICY "Directors have full access to employees" 
ON public.employees 
FOR ALL 
TO authenticated 
USING (is_god_mode_director());

-- Política universal para profiles
CREATE POLICY "Directors have full access to profiles" 
ON public.profiles 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

-- Política universal para registros financeiros
CREATE POLICY "Directors have full access to financial_records" 
ON public.financial_records 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

-- Política universal para estoque
CREATE POLICY "Directors have full access to stock_items" 
ON public.stock_items 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

-- Política universal para relatórios de atendimento
CREATE POLICY "Directors have full access to attendance_reports" 
ON public.attendance_reports 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

-- Política universal para relatórios de funcionários
CREATE POLICY "Directors have full access to employee_reports" 
ON public.employee_reports 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

-- Política universal para registros médicos
CREATE POLICY "Directors have full access to medical_records" 
ON public.medical_records 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

-- Política universal para agendamentos
CREATE POLICY "Directors have full access to schedules" 
ON public.schedules 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

-- Política universal para mensagens internas
CREATE POLICY "Directors have full access to internal_messages" 
ON public.internal_messages 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

-- Política universal para notificações
CREATE POLICY "Directors have full access to notifications" 
ON public.notifications 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

-- Política universal para documentos
CREATE POLICY "Directors have full access to documents" 
ON public.documents 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

-- Política universal para notas de clientes
CREATE POLICY "Directors have full access to client_notes" 
ON public.client_notes 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

-- Política universal para documentos de clientes
CREATE POLICY "Directors have full access to client_documents" 
ON public.client_documents 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

-- Política universal para atribuições de clientes
CREATE POLICY "Directors have full access to client_assignments" 
ON public.client_assignments 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

-- Política universal para notas
CREATE POLICY "Directors have full access to notes" 
ON public.notes 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

-- Política universal para registros automáticos financeiros
CREATE POLICY "Directors have full access to automatic_financial_records" 
ON public.automatic_financial_records 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

-- Política universal para movimentações de estoque
CREATE POLICY "Directors have full access to stock_movements" 
ON public.stock_movements 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

-- Política universal para timesheet
CREATE POLICY "Directors have full access to employee_timesheet" 
ON public.employee_timesheet 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

-- Política universal para alertas de reunião
CREATE POLICY "Directors have full access to meeting_alerts" 
ON public.meeting_alerts 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_directors());

-- Política universal para sessões de atendimento
CREATE POLICY "Directors have full access to appointment_sessions" 
ON public.appointment_sessions 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

-- Política universal para tipos de anamnese
CREATE POLICY "Directors have full access to anamnesis_types" 
ON public.anamnesis_types 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

-- Política universal para canais
CREATE POLICY "Directors have full access to channels" 
ON public.channels 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

-- Política universal para membros de canal
CREATE POLICY "Directors have full access to channel_members" 
ON public.channel_members 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

-- Política universal para compartilhamento de arquivos
CREATE POLICY "Directors have full access to file_shares" 
ON public.file_shares 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

-- Dar acesso total aos logs de auditoria para diretores
CREATE POLICY "Directors can view all audit_logs" 
ON public.audit_logs 
FOR SELECT 
TO authenticated 
USING (is_god_mode_director());

-- Dar acesso ao log de auditoria financeira para diretores
CREATE POLICY "Directors can view all financial_audit_log" 
ON public.financial_audit_log 
FOR SELECT 
TO authenticated 
USING (is_god_mode_director());

-- Dar acesso às notas financeiras para diretores
CREATE POLICY "Directors have full access to financial_notes" 
ON public.financial_notes 
FOR ALL 
TO authenticated 
USING (is_god_mode_director())
WITH CHECK (is_god_mode_director());

-- Atualizar função para permitir que diretores vejam todos os detalhes de funcionários
CREATE OR REPLACE FUNCTION public.get_director_all_access_employee_details()
RETURNS TABLE(
  profile_id uuid, user_id uuid, name text, employee_role employee_role, 
  phone text, document_cpf text, document_rg text, birth_date date, 
  address text, is_active boolean, hire_date date, department text, 
  salary numeric, permissions jsonb, employee_code text, 
  emergency_contact text, emergency_phone text, professional_license text, 
  specialization text, work_schedule jsonb, employee_notes text, 
  created_at timestamp with time zone, updated_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id AS profile_id, p.user_id, p.name, p.employee_role,
    p.phone, p.document_cpf, p.document_rg, p.birth_date, p.address,
    p.is_active, p.hire_date, p.department, p.salary, p.permissions,
    e.employee_code, e.emergency_contact, e.emergency_phone, 
    e.professional_license, e.specialization, e.work_schedule, 
    e.notes AS employee_notes, p.created_at, p.updated_at
  FROM profiles p
  LEFT JOIN employees e ON p.id = e.profile_id
  WHERE p.employee_role IS NOT NULL
    AND (
      -- Se é diretor, vê tudo sem restrições
      is_god_mode_director()
      -- Se não é diretor, usa as regras normais
      OR (
        auth.uid() = p.user_id 
        OR user_has_role(ARRAY['coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role])
      )
    );
$$;