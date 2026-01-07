-- Corrigir função validate_attendance_report para não usar employee_id nos registros financeiros
CREATE OR REPLACE FUNCTION public.validate_attendance_report(
  p_attendance_report_id uuid, 
  p_action text, 
  p_rejection_reason text DEFAULT NULL::text, 
  p_professional_amount numeric DEFAULT 0, 
  p_foundation_amount numeric DEFAULT 0,
  p_total_amount numeric DEFAULT 0
)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  validator_name TEXT;
  attendance_record RECORD;
  material RECORD;
  current_stock_qty INTEGER;
  total_materials_cost NUMERIC := 0;
  materials_list TEXT := '';
  final_professional_amount NUMERIC;
  final_foundation_amount NUMERIC;
  final_total_amount NUMERIC;
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
    
    -- Usar valores dos parâmetros se fornecidos, senão usar valores salvos no relatório
    final_professional_amount := COALESCE(NULLIF(p_professional_amount, 0), attendance_record.professional_amount, 0);
    final_foundation_amount := COALESCE(NULLIF(p_foundation_amount, 0), attendance_record.institution_amount, 0);
    final_total_amount := COALESCE(NULLIF(p_total_amount, 0), attendance_record.amount_charged, 0);
    
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
    
    -- Processar materiais utilizados com valores corretos
    IF attendance_record.materials_used IS NOT NULL THEN
      FOR material IN SELECT * FROM jsonb_array_elements(attendance_record.materials_used::jsonb)
      LOOP
        -- Buscar estoque atual
        SELECT current_quantity INTO current_stock_qty 
        FROM stock_items 
        WHERE id = (material.value->>'stock_item_id')::UUID;
        
        IF current_stock_qty IS NOT NULL AND current_stock_qty >= (material.value->>'quantity')::INTEGER THEN
          -- Usar o valor correto do material (unit_cost * quantity se total_cost não existir)
          DECLARE
            material_unit_cost NUMERIC := COALESCE((material.value->>'unit_cost')::NUMERIC, 0);
            material_quantity INTEGER := (material.value->>'quantity')::INTEGER;
            material_total_cost NUMERIC := COALESCE(
              (material.value->>'total_cost')::NUMERIC, 
              material_unit_cost * material_quantity
            );
          BEGIN
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
              material_quantity,
              current_stock_qty,
              current_stock_qty - material_quantity,
              material_unit_cost,
              material_total_cost,
              'atendimento_validado',
              attendance_record.attendance_type || ' - ' || attendance_record.patient_name,
              attendance_record.completed_by,
              auth.uid(),
              attendance_record.client_id,
              attendance_record.schedule_id,
              CURRENT_DATE
            );
            
            -- Atualizar estoque
            UPDATE stock_items 
            SET 
              current_quantity = current_stock_qty - material_quantity,
              updated_at = NOW()
            WHERE id = (material.value->>'stock_item_id')::UUID;
            
            -- Somar ao custo total
            total_materials_cost := total_materials_cost + material_total_cost;
            
            -- Adicionar à lista de materiais
            IF materials_list != '' THEN
              materials_list := materials_list || ', ';
            END IF;
            materials_list := materials_list || (material.value->>'name') || ' (' || material_quantity || ' ' || (material.value->>'unit') || ')';
          END;
        END IF;
      END LOOP;
    END IF;
    
    -- Criar registros financeiros (SEM employee_id para evitar erros de FK)
    -- 1. Receita da sessão (valor total cobrado)
    IF final_total_amount > 0 THEN
      INSERT INTO financial_records (
        type,
        category,
        description,
        amount,
        date,
        payment_method,
        client_id,
        created_by,
        notes
      ) VALUES (
        'income',
        'consultation',
        attendance_record.attendance_type || ' - ' || attendance_record.patient_name,
        final_total_amount,
        CURRENT_DATE,
        'cash',
        attendance_record.client_id,
        auth.uid(),
        'Atendimento validado - Valor total da sessão: R$ ' || final_total_amount
      );
    END IF;
    
    -- 2. Valor para o profissional (usar valor do relatório ou parâmetro)
    IF final_professional_amount > 0 THEN
      INSERT INTO financial_records (
        type,
        category,
        description,
        amount,
        date,
        payment_method,
        client_id,
        created_by,
        notes
      ) VALUES (
        'expense',
        'professional_payment',
        'Pagamento profissional - ' || attendance_record.patient_name || ' (' || attendance_record.professional_name || ')',
        final_professional_amount,
        CURRENT_DATE,
        'internal',
        attendance_record.client_id,
        auth.uid(),
        'Valor destinado ao profissional - ' || attendance_record.attendance_type
      );
    END IF;
    
    -- 3. Valor para a fundação (usar valor do relatório ou parâmetro)
    IF final_foundation_amount > 0 THEN
      INSERT INTO financial_records (
        type,
        category,
        description,
        amount,
        date,
        payment_method,
        client_id,
        created_by,
        notes
      ) VALUES (
        'income',
        'foundation_revenue',
        'Valor fundação - ' || attendance_record.patient_name,
        final_foundation_amount,
        CURRENT_DATE,
        'internal',
        attendance_record.client_id,
        auth.uid(),
        'Valor destinado à fundação - ' || attendance_record.attendance_type
      );
    END IF;
    
    -- 4. Custo dos materiais
    IF total_materials_cost > 0 THEN
      INSERT INTO financial_records (
        type,
        category,
        description,
        amount,
        date,
        payment_method,
        client_id,
        created_by,
        notes
      ) VALUES (
        'expense',
        'supplies',
        'Materiais - ' || attendance_record.patient_name || ': ' || materials_list,
        total_materials_cost,
        CURRENT_DATE,
        'internal',
        attendance_record.client_id,
        auth.uid(),
        'Custo de materiais para ' || attendance_record.attendance_type
      );
    END IF;
    
    -- Atualizar status do schedule para completed
    UPDATE schedules 
    SET status = 'completed'
    WHERE id = attendance_record.schedule_id;
    
  ELSIF p_action = 'reject' THEN
    -- Buscar dados do attendance_report para a rejeição
    SELECT * INTO attendance_record FROM attendance_reports WHERE id = p_attendance_report_id;
    
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
    WHERE schedule_id = attendance_record.schedule_id;
    
    -- Voltar status do schedule para scheduled (não pending, que é inválido)
    UPDATE schedules 
    SET status = 'scheduled'
    WHERE id = attendance_record.schedule_id;
    
  ELSE
    RAISE EXCEPTION 'Ação inválida. Use "validate" ou "reject"';
  END IF;
  
  RETURN TRUE;
END;
$function$;