
-- Deletar completamente o usuário Christopher (psichristophermenezes@gmail.com)
-- user_id: cd933617-bab8-42bd-abe4-bc44502d97b4

-- 1. Deletar atribuições de clientes
DELETE FROM client_assignments 
WHERE employee_id = 'cd933617-bab8-42bd-abe4-bc44502d97b4';

-- 2. Deletar registros de funcionário
DELETE FROM employees 
WHERE user_id = 'cd933617-bab8-42bd-abe4-bc44502d97b4';

-- 3. Deletar timesheet entries
DELETE FROM employee_timesheet 
WHERE employee_id = 'cd933617-bab8-42bd-abe4-bc44502d97b4';

-- 4. Deletar notificações de agendamento
DELETE FROM appointment_notifications 
WHERE employee_id = 'cd933617-bab8-42bd-abe4-bc44502d97b4';

-- 5. Deletar mensagens internas (como remetente ou destinatário)
DELETE FROM internal_messages 
WHERE sender_id = 'cd933617-bab8-42bd-abe4-bc44502d97b4' 
   OR recipient_id = 'cd933617-bab8-42bd-abe4-bc44502d97b4';

-- 6. Deletar memberships de canais
DELETE FROM channel_members 
WHERE user_id = 'cd933617-bab8-42bd-abe4-bc44502d97b4';

-- 7. Deletar compartilhamentos de arquivos
DELETE FROM file_shares 
WHERE shared_by = 'cd933617-bab8-42bd-abe4-bc44502d97b4' 
   OR shared_with = 'cd933617-bab8-42bd-abe4-bc44502d97b4';

-- 8. Deletar notas criadas pelo usuário
DELETE FROM notes 
WHERE created_by = 'cd933617-bab8-42bd-abe4-bc44502d97b4';

-- 9. Deletar notas de clientes criadas pelo usuário
DELETE FROM client_notes 
WHERE created_by = 'cd933617-bab8-42bd-abe4-bc44502d97b4';

-- 10. Deletar documentos de clientes
DELETE FROM client_documents 
WHERE uploaded_by = 'cd933617-bab8-42bd-abe4-bc44502d97b4';

-- 11. Deletar atribuições de cargo customizado
DELETE FROM user_job_assignments 
WHERE user_id = 'cd933617-bab8-42bd-abe4-bc44502d97b4';

-- 12. Deletar permissões específicas do usuário
DELETE FROM user_specific_permissions 
WHERE user_id = 'cd933617-bab8-42bd-abe4-bc44502d97b4';

-- 13. Deletar perfil (profiles) - isso vai falhar se houver outras referências
DELETE FROM profiles 
WHERE user_id = 'cd933617-bab8-42bd-abe4-bc44502d97b4';

-- 14. Deletar usuário do auth.users (usa função admin)
-- Nota: Esta parte precisa ser executada via edge function ou API admin
SELECT auth.uid() as executor_id;
