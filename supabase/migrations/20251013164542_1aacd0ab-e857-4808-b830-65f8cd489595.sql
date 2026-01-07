-- Tornar o campo employee_id nullable na tabela financial_records
-- Isso permite criar registros financeiros automáticos sem vincular a um funcionário específico
ALTER TABLE public.financial_records 
ALTER COLUMN employee_id DROP NOT NULL;

-- Adicionar um comentário explicativo
COMMENT ON COLUMN public.financial_records.employee_id IS 'ID do funcionário relacionado ao registro financeiro (opcional para registros automáticos do sistema)';