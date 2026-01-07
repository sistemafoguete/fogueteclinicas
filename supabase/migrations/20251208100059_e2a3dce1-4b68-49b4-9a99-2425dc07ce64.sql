-- =====================================================
-- CORREÇÃO COMPLETA DAS POLÍTICAS RLS PARA ATENDIMENTO FLORESTA
-- =====================================================

-- =====================================================
-- 1. TABELA CLIENTS - Corrigir políticas para incluir atendimento_floresta
-- =====================================================

-- Remover políticas existentes que precisam ser atualizadas
DROP POLICY IF EXISTS "View clients policy" ON clients;
DROP POLICY IF EXISTS "Update clients policy" ON clients;
DROP POLICY IF EXISTS "Create clients policy" ON clients;
DROP POLICY IF EXISTS "Coordinators can update clients" ON clients;

-- Política de visualização atualizada
CREATE POLICY "View clients policy" ON clients FOR SELECT USING (
  -- Diretores veem tudo
  (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'director' AND is_active = true))
  -- Coordenadores veem sua unidade
  OR ((unit = 'madre') AND (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'coordinator_madre' AND is_active = true)))
  OR ((unit = 'floresta') AND (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'coordinator_floresta' AND is_active = true)))
  OR ((unit = 'atendimento_floresta') AND (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'coordinator_atendimento_floresta' AND is_active = true)))
  -- Recepcionistas veem todos
  OR (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'receptionist' AND is_active = true))
  -- Profissionais veem clientes atribuídos
  OR (EXISTS (SELECT 1 FROM client_assignments ca WHERE ca.client_id = clients.id AND ca.employee_id = auth.uid() AND ca.is_active = true))
  -- Profissionais veem clientes com devolutivas atribuídas
  OR (EXISTS (SELECT 1 FROM client_feedback_control cfc WHERE cfc.client_id = clients.id AND cfc.assigned_to = auth.uid()))
  -- Profissionais veem clientes com agendamentos
  OR (EXISTS (SELECT 1 FROM schedules s WHERE s.client_id = clients.id AND s.employee_id = auth.uid()))
);

-- Política de criação atualizada
CREATE POLICY "Create clients policy" ON clients FOR INSERT WITH CHECK (
  -- Diretores podem criar qualquer cliente
  (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'director' AND is_active = true))
  -- Coordenadores podem criar na sua unidade
  OR ((unit = 'madre') AND (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'coordinator_madre' AND is_active = true)))
  OR ((unit = 'floresta') AND (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'coordinator_floresta' AND is_active = true)))
  OR ((unit = 'atendimento_floresta') AND (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'coordinator_atendimento_floresta' AND is_active = true)))
  -- Recepcionistas podem criar
  OR (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'receptionist' AND is_active = true))
);

-- Política de atualização atualizada
CREATE POLICY "Update clients policy" ON clients FOR UPDATE USING (
  -- Diretores podem atualizar qualquer cliente
  (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'director' AND is_active = true))
  -- Coordenadores podem atualizar na sua unidade
  OR ((unit = 'madre') AND (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'coordinator_madre' AND is_active = true)))
  OR ((unit = 'floresta') AND (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'coordinator_floresta' AND is_active = true)))
  OR ((unit = 'atendimento_floresta') AND (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'coordinator_atendimento_floresta' AND is_active = true)))
);

-- =====================================================
-- 2. TABELA SCHEDULES - Corrigir políticas para incluir atendimento_floresta
-- =====================================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "View schedules" ON schedules;
DROP POLICY IF EXISTS "Create schedules" ON schedules;
DROP POLICY IF EXISTS "Update schedules" ON schedules;
DROP POLICY IF EXISTS "Delete schedules" ON schedules;
DROP POLICY IF EXISTS "Staff can view schedules" ON schedules;
DROP POLICY IF EXISTS "Staff can create schedules" ON schedules;
DROP POLICY IF EXISTS "Staff can update schedules" ON schedules;
DROP POLICY IF EXISTS "Staff can delete schedules" ON schedules;

-- Política de visualização
CREATE POLICY "View schedules" ON schedules FOR SELECT USING (
  -- Diretores veem tudo
  director_has_god_mode()
  -- Coordenadores veem sua unidade
  OR ((unit = 'madre') AND (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'coordinator_madre' AND is_active = true)))
  OR ((unit = 'floresta') AND (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'coordinator_floresta' AND is_active = true)))
  OR ((unit = 'atendimento_floresta') AND (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'coordinator_atendimento_floresta' AND is_active = true)))
  -- Recepcionistas veem todos
  OR (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'receptionist' AND is_active = true))
  -- Profissionais veem seus próprios agendamentos
  OR (employee_id = auth.uid())
);

-- Política de criação
CREATE POLICY "Create schedules" ON schedules FOR INSERT WITH CHECK (
  -- Diretores podem criar qualquer agendamento
  director_has_god_mode()
  -- Coordenadores podem criar na sua unidade
  OR ((unit = 'madre') AND (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'coordinator_madre' AND is_active = true)))
  OR ((unit = 'floresta') AND (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'coordinator_floresta' AND is_active = true)))
  OR ((unit = 'atendimento_floresta') AND (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'coordinator_atendimento_floresta' AND is_active = true)))
  -- Recepcionistas podem criar
  OR (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'receptionist' AND is_active = true))
);

-- Política de atualização
CREATE POLICY "Update schedules" ON schedules FOR UPDATE USING (
  -- Diretores podem atualizar qualquer agendamento
  director_has_god_mode()
  -- Coordenadores podem atualizar na sua unidade
  OR ((unit = 'madre') AND (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'coordinator_madre' AND is_active = true)))
  OR ((unit = 'floresta') AND (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'coordinator_floresta' AND is_active = true)))
  OR ((unit = 'atendimento_floresta') AND (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'coordinator_atendimento_floresta' AND is_active = true)))
  -- Profissionais podem atualizar seus próprios agendamentos
  OR (employee_id = auth.uid())
);

-- Política de deleção
CREATE POLICY "Delete schedules" ON schedules FOR DELETE USING (
  -- Diretores podem deletar qualquer agendamento
  director_has_god_mode()
  -- Coordenadores podem deletar na sua unidade
  OR ((unit = 'madre') AND (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'coordinator_madre' AND is_active = true)))
  OR ((unit = 'floresta') AND (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'coordinator_floresta' AND is_active = true)))
  OR ((unit = 'atendimento_floresta') AND (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'coordinator_atendimento_floresta' AND is_active = true)))
  -- Recepcionistas podem deletar
  OR (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND employee_role = 'receptionist' AND is_active = true))
);

-- =====================================================
-- 3. TABELA APPOINTMENT_NOTIFICATIONS - Atualizar políticas
-- =====================================================

DROP POLICY IF EXISTS "Coordinators and directors can insert notifications" ON appointment_notifications;
DROP POLICY IF EXISTS "Directors and coordinators can create notifications" ON appointment_notifications;

CREATE POLICY "Coordinators and directors can create notifications" ON appointment_notifications FOR INSERT WITH CHECK (
  (created_by = auth.uid()) AND (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.employee_role = ANY (ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role, 'coordinator_atendimento_floresta'::employee_role])
    AND p.is_active = true
  ))
);

DROP POLICY IF EXISTS "Users can view relevant notifications" ON appointment_notifications;

CREATE POLICY "Users can view relevant notifications" ON appointment_notifications FOR SELECT USING (
  (employee_id = auth.uid()) 
  OR (created_by = auth.uid()) 
  OR (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() 
    AND profiles.employee_role = ANY (ARRAY['director'::employee_role, 'coordinator_floresta'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_atendimento_floresta'::employee_role])
    AND profiles.is_active = true
  ))
);

-- =====================================================
-- 4. TABELA CLIENT_FEEDBACK_CONTROL - Atualizar políticas
-- =====================================================

DROP POLICY IF EXISTS "Coordenadores podem criar devolutivas" ON client_feedback_control;
DROP POLICY IF EXISTS "Coordenadores podem deletar devolutivas" ON client_feedback_control;
DROP POLICY IF EXISTS "Coordenadores e atribuídos podem atualizar devolutivas" ON client_feedback_control;
DROP POLICY IF EXISTS "Todos podem ver devolutivas atribuídas ou gerenciar tudo" ON client_feedback_control;

CREATE POLICY "Coordenadores podem criar devolutivas" ON client_feedback_control FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() 
    AND employee_role = ANY (ARRAY['director'::employee_role, 'coordinator_floresta'::employee_role, 'coordinator_atendimento_floresta'::employee_role])
    AND is_active = true)
);

CREATE POLICY "Coordenadores podem deletar devolutivas" ON client_feedback_control FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() 
    AND employee_role = ANY (ARRAY['director'::employee_role, 'coordinator_floresta'::employee_role, 'coordinator_atendimento_floresta'::employee_role])
    AND is_active = true)
);

CREATE POLICY "Coordenadores e atribuídos podem atualizar devolutivas" ON client_feedback_control FOR UPDATE USING (
  (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() 
    AND employee_role = ANY (ARRAY['director'::employee_role, 'coordinator_floresta'::employee_role, 'coordinator_atendimento_floresta'::employee_role])
    AND is_active = true))
  OR ((assigned_to = auth.uid()) AND (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_active = true)))
);

CREATE POLICY "Todos podem ver devolutivas atribuídas ou gerenciar tudo" ON client_feedback_control FOR SELECT USING (
  (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() 
    AND employee_role = ANY (ARRAY['director'::employee_role, 'coordinator_floresta'::employee_role, 'coordinator_atendimento_floresta'::employee_role])
    AND is_active = true))
  OR ((assigned_to = auth.uid()) AND (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_active = true)))
);

-- =====================================================
-- 5. TABELA AUDIT_LOGS - Atualizar políticas
-- =====================================================

DROP POLICY IF EXISTS "Directors and coordinators can view all audit logs" ON audit_logs;

CREATE POLICY "Directors and coordinators can view all audit logs" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() 
    AND employee_role = ANY (ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role, 'coordinator_atendimento_floresta'::employee_role])
    AND is_active = true)
);

-- =====================================================
-- 6. TABELA CHANNELS - Atualizar políticas
-- =====================================================

DROP POLICY IF EXISTS "Directors and coordinators can manage channels" ON channels;

CREATE POLICY "Directors and coordinators can manage channels" ON channels FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() 
    AND employee_role = ANY (ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role, 'coordinator_atendimento_floresta'::employee_role])
    AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() 
    AND employee_role = ANY (ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role, 'coordinator_atendimento_floresta'::employee_role])
    AND is_active = true)
);

-- =====================================================
-- 7. TABELA CHANNEL_MEMBERS - Atualizar políticas
-- =====================================================

DROP POLICY IF EXISTS "Directors and coordinators can manage channel memberships" ON channel_members;

CREATE POLICY "Directors and coordinators can manage channel memberships" ON channel_members FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() 
    AND employee_role = ANY (ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role, 'coordinator_atendimento_floresta'::employee_role])
    AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() 
    AND employee_role = ANY (ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role, 'coordinator_atendimento_floresta'::employee_role])
    AND is_active = true)
);

-- =====================================================
-- 8. TABELA EMPLOYEES - Atualizar políticas
-- =====================================================

DROP POLICY IF EXISTS "Staff can view employee records" ON employees;
DROP POLICY IF EXISTS "Staff can update employee records" ON employees;
DROP POLICY IF EXISTS "Management can create employee records" ON employees;

CREATE POLICY "Staff can view employee records" ON employees FOR SELECT USING (
  (auth.uid() = user_id) 
  OR (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() 
    AND employee_role = ANY (ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role, 'coordinator_atendimento_floresta'::employee_role])
    AND is_active = true))
);

CREATE POLICY "Staff can update employee records" ON employees FOR UPDATE USING (
  (auth.uid() = user_id) 
  OR (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() 
    AND employee_role = ANY (ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role, 'coordinator_atendimento_floresta'::employee_role])
    AND is_active = true))
);

CREATE POLICY "Management can create employee records" ON employees FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() 
    AND employee_role = ANY (ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role, 'coordinator_atendimento_floresta'::employee_role])
    AND is_active = true)
);

-- =====================================================
-- 9. ATUALIZAR FUNÇÃO user_has_role PARA INCLUIR coordinator_atendimento_floresta
-- =====================================================

CREATE OR REPLACE FUNCTION public.user_has_role(allowed_roles employee_role[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = ANY(allowed_roles)
    AND is_active = true
  );
$$;

-- =====================================================
-- 10. ATUALIZAR FUNÇÃO is_manager PARA INCLUIR coordinator_atendimento_floresta
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = ANY(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role, 'coordinator_atendimento_floresta'::employee_role])
    AND is_active = true
  );
$$;

-- =====================================================
-- 11. ATUALIZAR FUNÇÃO can_manage_employees PARA INCLUIR coordinator_atendimento_floresta
-- =====================================================

CREATE OR REPLACE FUNCTION public.can_manage_employees()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role, 'coordinator_atendimento_floresta'::employee_role])
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_active = true
  );
$$;