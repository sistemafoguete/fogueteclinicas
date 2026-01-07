-- Corrigir problemas de segurança nas funções criadas

-- Corrigir função create_stock_financial_record
CREATE OR REPLACE FUNCTION public.create_stock_financial_record()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Apenas inserir registro financeiro se:
  -- 1. É um novo item (INSERT)
  -- 2. Tem custo unitário maior que 0
  -- 3. Tem quantidade inicial maior que 0
  IF NEW.unit_cost > 0 AND NEW.current_quantity > 0 THEN
    INSERT INTO public.financial_records (
      type,
      category,
      description,
      amount,
      date,
      payment_method,
      notes,
      created_by
    ) VALUES (
      'expense'::text,
      'supplies'::text,
      'Compra de estoque: ' || NEW.name,
      (NEW.current_quantity * NEW.unit_cost),
      CURRENT_DATE,
      'cash'::text,
      'Registro automático - Item: ' || NEW.name || 
      ' | Categoria: ' || COALESCE(NEW.category, 'N/A') ||
      ' | Quantidade: ' || NEW.current_quantity ||
      ' | Unidade: ' || NEW.unit ||
      ' | Custo unitário: R$ ' || NEW.unit_cost ||
      ' | Fornecedor: ' || COALESCE(NEW.supplier, 'N/A') ||
      ' | Localização: ' || COALESCE(NEW.location, 'N/A'),
      COALESCE(NEW.created_by, auth.uid())
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Corrigir função create_stock_movement_financial_record
CREATE OR REPLACE FUNCTION public.create_stock_movement_financial_record()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  item_name TEXT;
  financial_description TEXT;
BEGIN
  -- Apenas para movimentações de entrada com custo
  IF NEW.type = 'entrada' AND NEW.total_cost > 0 THEN
    -- Buscar nome do item
    SELECT name INTO item_name 
    FROM public.stock_items 
    WHERE id = NEW.stock_item_id;
    
    -- Definir descrição baseada no motivo
    CASE NEW.reason
      WHEN 'Compra' THEN
        financial_description := 'Compra de estoque: ' || COALESCE(item_name, 'Item') || ' (' || NEW.quantity || ' unidades)';
      WHEN 'Doação' THEN
        financial_description := 'Doação recebida: ' || COALESCE(item_name, 'Item') || ' (' || NEW.quantity || ' unidades)';
      WHEN 'Transferência recebida' THEN
        financial_description := 'Transferência recebida: ' || COALESCE(item_name, 'Item') || ' (' || NEW.quantity || ' unidades)';
      ELSE
        financial_description := 'Entrada de estoque: ' || COALESCE(item_name, 'Item') || ' (' || NEW.quantity || ' unidades)';
    END CASE;
    
    -- Inserir registro financeiro apenas para compras (que geram despesa real)
    IF NEW.reason = 'Compra' THEN
      INSERT INTO public.financial_records (
        type,
        category,
        description,
        amount,
        date,
        payment_method,
        notes,
        created_by
      ) VALUES (
        'expense'::text,
        'supplies'::text,
        financial_description,
        NEW.total_cost,
        NEW.date,
        'cash'::text,
        'Movimentação de estoque - ' || NEW.reason || 
        CASE WHEN NEW.notes IS NOT NULL THEN ' - ' || NEW.notes ELSE '' END,
        COALESCE(NEW.created_by, auth.uid())
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;