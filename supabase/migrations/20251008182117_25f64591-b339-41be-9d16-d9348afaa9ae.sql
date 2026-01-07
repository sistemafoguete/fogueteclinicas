-- Remover índice e coluna assigned_to da tabela client_feedback_control
DROP INDEX IF EXISTS idx_feedback_assigned_to;

ALTER TABLE client_feedback_control 
DROP COLUMN IF EXISTS assigned_to;