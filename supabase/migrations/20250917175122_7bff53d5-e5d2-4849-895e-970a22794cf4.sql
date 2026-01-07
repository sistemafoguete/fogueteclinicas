-- Reset do sistema: limpar dados operacionais mantendo cadastros básicos

-- ====== FINANCEIRO ======
-- Remover todos os registros financeiros
DELETE FROM public.financial_audit_log;
DELETE FROM public.automatic_financial_records;
DELETE FROM public.financial_records;
DELETE FROM public.financial_notes;

-- ====== RELATÓRIOS ======
-- Remover todos os relatórios
DELETE FROM public.attendance_reports;
DELETE FROM public.employee_reports;

-- ====== AGENDAMENTOS E ATENDIMENTOS ======
-- Remover sessões de atendimento
DELETE FROM public.appointment_sessions;
-- Remover agendamentos
DELETE FROM public.schedules;
-- Remover registros médicos
DELETE FROM public.medical_records;

-- ====== DADOS DE CLIENTES (históricos e atividades) ======
-- Remover notas dos clientes
DELETE FROM public.client_notes;
-- Remover documentos dos clientes
DELETE FROM public.client_documents;

-- Limpar campos de histórico dos clientes (manter cadastro básico)
UPDATE public.clients SET
  last_session_date = NULL,
  last_session_type = NULL,
  last_session_notes = NULL,
  treatment_progress = NULL,
  current_symptoms = NULL,
  current_medications = '[]'::jsonb,
  vital_signs_history = '[]'::jsonb,
  clinical_observations = NULL,
  treatment_expectations = NULL,
  neuropsych_complaint = NULL,
  updated_at = NOW();

-- ====== DADOS DE FUNCIONÁRIOS (históricos e atividades) ======
-- Remover registros de ponto
DELETE FROM public.employee_timesheet;

-- Limpar campos opcionais de histórico nos profiles (manter dados básicos)
UPDATE public.profiles SET
  permissions = '{}'::jsonb,
  updated_at = NOW();

-- ====== COMUNICAÇÃO E NOTIFICAÇÕES ======
-- Remover mensagens internas
DELETE FROM public.internal_messages;
-- Remover notificações
DELETE FROM public.notifications;
-- Remover alertas de reunião
DELETE FROM public.meeting_alerts;

-- ====== DOCUMENTOS E ARQUIVOS ======
-- Remover compartilhamentos de arquivos
DELETE FROM public.file_shares;
-- Remover documentos
DELETE FROM public.documents;
-- Remover notas gerais
DELETE FROM public.notes;

-- ====== CANAIS DE COMUNICAÇÃO ======
-- Remover membros dos canais
DELETE FROM public.channel_members;
-- Remover canais (exceto os padrão se houver)
DELETE FROM public.channels WHERE name NOT IN ('Geral', 'Anúncios');

-- ====== LOGS E AUDITORIA ======
-- Remover logs de auditoria (manter estrutura de permissões)
DELETE FROM public.audit_logs;
-- Manter permission_audit_log para rastreabilidade de permissões

-- ====== MENSAGEM DE CONFIRMAÇÃO ======
-- Inserir notificação de reset para administradores
INSERT INTO public.notifications (
  title,
  message,
  type,
  is_global,
  created_at
) VALUES (
  'Sistema Resetado',
  'O sistema foi resetado com sucesso. Todos os dados operacionais foram removidos, mantendo apenas os cadastros de funcionários e clientes.',
  'success',
  true,
  NOW()
);