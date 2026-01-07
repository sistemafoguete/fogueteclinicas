-- Adicionar campos para controle de validação nos attendance_reports
ALTER TABLE public.attendance_reports 
ADD COLUMN validation_status TEXT DEFAULT 'pending_validation' CHECK (validation_status IN ('pending_validation', 'validated', 'rejected')),
ADD COLUMN validated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN validated_by UUID,
ADD COLUMN validated_by_name TEXT,
ADD COLUMN rejection_reason TEXT;

-- Adicionar campos similares nos employee_reports  
ALTER TABLE public.employee_reports
ADD COLUMN validation_status TEXT DEFAULT 'pending_validation' CHECK (validation_status IN ('pending_validation', 'validated', 'rejected')),
ADD COLUMN validated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN validated_by UUID,
ADD COLUMN validated_by_name TEXT,
ADD COLUMN rejection_reason TEXT;

-- Criar índices para performance
CREATE INDEX idx_attendance_reports_validation_status ON public.attendance_reports(validation_status);
CREATE INDEX idx_employee_reports_validation_status ON public.employee_reports(validation_status);

-- Função para validar atendimentos (apenas coordenadores e diretores)
CREATE OR REPLACE FUNCTION public.validate_attendance_report(
  p_attendance_report_id UUID,
  p_action TEXT, -- 'validate' ou 'reject'
  p_rejection_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  validator_name TEXT;
  attendance_record RECORD;
BEGIN
  -- Verificar se usuário tem permissão (coordenador ou diretor)
  IF NOT user_has_role(ARRAY['director'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role]) THEN
    RAISE EXCEPTION 'Apenas coordenadores e diretores podem validar atendimentos';
  END IF;
  
  -- Buscar nome do validador
  SELECT name INTO validator_name FROM profiles WHERE user_id = auth.uid();
  
  IF p_action = 'validate' THEN
    -- Buscar dados do attendance_report
    SELECT * INTO attendance_record FROM attendance_reports WHERE id = p_attendance_report_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Registro de atendimento não encontrado';
    END IF;
    
    -- Atualizar status para validado
    UPDATE attendance_reports 
    SET 
      validation_status = 'validated',
      validated_at = NOW(),
      validated_by = auth.uid(),
      validated_by_name = validator_name
    WHERE id = p_attendance_report_id;
    
    -- Atualizar employee_report correspondente
    UPDATE employee_reports 
    SET 
      validation_status = 'validated',
      validated_at = NOW(),
      validated_by = auth.uid(),
      validated_by_name = validator_name
    WHERE schedule_id = attendance_record.schedule_id;
    
    -- Processar movimentações de estoque (apenas quando validado)
    IF attendance_record.materials_used IS NOT NULL THEN
      -- Aqui vamos processar o estoque e financeiro apenas quando validado
      -- (código será implementado depois)
    END IF;
    
  ELSIF p_action = 'reject' THEN
    -- Rejeitar atendimento
    UPDATE attendance_reports 
    SET 
      validation_status = 'rejected',
      validated_at = NOW(),
      validated_by = auth.uid(),
      validated_by_name = validator_name,
      rejection_reason = p_rejection_reason
    WHERE id = p_attendance_report_id;
    
    -- Atualizar employee_report correspondente
    UPDATE employee_reports 
    SET 
      validation_status = 'rejected',
      validated_at = NOW(),
      validated_by = auth.uid(),
      validated_by_name = validator_name,
      rejection_reason = p_rejection_reason
    WHERE schedule_id = (SELECT schedule_id FROM attendance_reports WHERE id = p_attendance_report_id);
    
  ELSE
    RAISE EXCEPTION 'Ação inválida. Use "validate" ou "reject"';
  END IF;
  
  RETURN TRUE;
END;
$$;