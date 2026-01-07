-- Adicionar campo total_expense na tabela stock_items
ALTER TABLE public.stock_items 
ADD COLUMN IF NOT EXISTS total_expense NUMERIC DEFAULT 0;

-- Atualizar função create_stock_financial_record para usar total_expense quando disponível
CREATE OR REPLACE FUNCTION public.create_stock_financial_record()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  financial_amount NUMERIC;
BEGIN
  -- Calcular valor a ser registrado financeiramente
  -- Prioridade: total_expense se > 0, senão unit_cost * quantity
  IF NEW.total_expense IS NOT NULL AND NEW.total_expense > 0 THEN
    financial_amount := NEW.total_expense;
  ELSIF NEW.unit_cost > 0 AND NEW.current_quantity > 0 THEN
    financial_amount := NEW.current_quantity * NEW.unit_cost;
  ELSE
    financial_amount := 0;
  END IF;

  -- Apenas inserir registro financeiro se houver valor a registrar
  IF financial_amount > 0 THEN
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
      financial_amount,
      CURRENT_DATE,
      'cash'::text,
      'Registro automático - Item: ' || NEW.name || 
      ' | Categoria: ' || COALESCE(NEW.category, 'N/A') ||
      ' | Quantidade: ' || NEW.current_quantity ||
      ' | Unidade: ' || NEW.unit ||
      ' | Custo unitário: R$ ' || NEW.unit_cost ||
      CASE 
        WHEN NEW.total_expense IS NOT NULL AND NEW.total_expense > 0 THEN
          ' | Despesa total: R$ ' || NEW.total_expense
        ELSE
          ' | Despesa calculada: R$ ' || financial_amount
      END ||
      ' | Fornecedor: ' || COALESCE(NEW.supplier, 'N/A') ||
      ' | Localização: ' || COALESCE(NEW.location, 'N/A'),
      COALESCE(NEW.created_by, auth.uid())
    );
  END IF;
  
  RETURN NEW;
END;
$function$;