-- Recalcular deadline_date para todos os registros de feedback não concluídos
-- O deadline deve ser 15 dias úteis após a data de início (started_at)
UPDATE public.client_feedback_control 
SET deadline_date = calculate_feedback_deadline(started_at::DATE)
WHERE status != 'completed';

-- Também atualizar registros que tenham deadline igual ao started_at (erro evidente)
UPDATE public.client_feedback_control 
SET deadline_date = calculate_feedback_deadline(started_at::DATE)
WHERE deadline_date::DATE = started_at::DATE;