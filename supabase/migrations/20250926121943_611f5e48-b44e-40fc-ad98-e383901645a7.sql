-- Completar a função de validação para processar estoque e financeiro
CREATE OR REPLACE FUNCTION public.process_attendance_validation(
  p_attendance_record RECORD
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  material RECORD;
  current_stock_qty INTEGER;
  total_materials_cost NUMERIC := 0;
  materials_list TEXT := '';
BEGIN
  -- Processar materiais utilizados
  IF p_attendance_record.materials_used IS NOT NULL THEN
    FOR material IN SELECT * FROM jsonb_array_elements(p_attendance_record.materials_used::jsonb)
    LOOP
      -- Buscar estoque atual
      SELECT current_quantity INTO current_stock_qty 
      FROM stock_items 
      WHERE id = (material.value->>'stock_item_id')::UUID;
      
      IF current_stock_qty IS NOT NULL AND current_stock_qty >= (material.value->>'quantity')::INTEGER THEN
        -- Criar movimentação de estoque
        INSERT INTO stock_movements (
          stock_item_id,
          type,
          quantity,
          previous_quantity,
          new_quantity,
          unit_cost,
          total_cost,
          reason,
          notes,
          moved_by,
          created_by,
          client_id,
          schedule_id,
          date
        ) VALUES (
          (material.value->>'stock_item_id')::UUID,
          'saida',
          (material.value->>'quantity')::INTEGER,
          current_stock_qty,
          current_stock_qty - (material.value->>'quantity')::INTEGER,
          COALESCE((material.value->>'unit_cost')::NUMERIC, 0),
          COALESCE((material.value->>'total_cost')::NUMERIC, 0),
          'atendimento_validado',
          p_attendance_record.attendance_type || ' - ' || p_attendance_record.patient_name,
          p_attendance_record.completed_by,
          auth.uid(),
          p_attendance_record.client_id,
          p_attendance_record.schedule_id,
          CURRENT_DATE
        );
        
        -- Atualizar estoque
        UPDATE stock_items 
        SET 
          current_quantity = current_stock_qty - (material.value->>'quantity')::INTEGER,
          updated_at = NOW()
        WHERE id = (material.value->>'stock_item_id')::UUID;
        
        -- Somar ao custo total
        total_materials_cost := total_materials_cost + COALESCE((material.value->>'total_cost')::NUMERIC, 0);
        
        -- Adicionar à lista de materiais
        IF materials_list != '' THEN
          materials_list := materials_list || ', ';
        END IF;
        materials_list := materials_list || (material.value->>'name') || ' (' || (material.value->>'quantity') || ' ' || (material.value->>'unit') || ')';
      END IF;
    END LOOP;
  END IF;
  
  -- Criar registros financeiros
  -- 1. Receita da sessão
  IF p_attendance_record.amount_charged > 0 THEN
    INSERT INTO financial_records (
      type,
      category,
      description,
      amount,
      date,
      payment_method,
      client_id,
      employee_id,
      created_by,
      notes
    ) VALUES (
      'income',
      'consultation',
      p_attendance_record.attendance_type || ' - ' || p_attendance_record.patient_name,
      p_attendance_record.amount_charged,
      CURRENT_DATE,
      'cash', -- Default, pode ser melhorado depois
      p_attendance_record.client_id,
      p_attendance_record.employee_id,
      auth.uid(),
      'Atendimento validado automaticamente'
    );
  END IF;
  
  -- 2. Custo dos materiais
  IF total_materials_cost > 0 THEN
    INSERT INTO financial_records (
      type,
      category,
      description,
      amount,
      date,
      payment_method,
      client_id,
      employee_id,
      created_by,
      notes
    ) VALUES (
      'expense',
      'supplies',
      'Materiais - ' || p_attendance_record.patient_name || ': ' || materials_list,
      total_materials_cost,
      CURRENT_DATE,
      'internal',
      p_attendance_record.client_id,
      p_attendance_record.employee_id,
      auth.uid(),
      'Custo de materiais para ' || p_attendance_record.attendance_type
    );
  END IF;
  
  -- Atualizar status do schedule para completed
  UPDATE schedules 
  SET status = 'completed'
  WHERE id = p_attendance_record.schedule_id;
  
  RETURN TRUE;
END;
$$;

-- Atualizar a função principal de validação
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
    
    -- Processar movimentações de estoque e financeiro
    PERFORM process_attendance_validation(attendance_record);
    
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
    
    -- Voltar status do schedule para pending se rejeitado
    UPDATE schedules 
    SET status = 'pending'
    WHERE id = (SELECT schedule_id FROM attendance_reports WHERE id = p_attendance_report_id);
    
  ELSE
    RAISE EXCEPTION 'Ação inválida. Use "validate" ou "reject"';
  END IF;
  
  RETURN TRUE;
END;
$$;