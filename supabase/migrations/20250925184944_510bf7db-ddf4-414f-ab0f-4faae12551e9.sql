-- Corrigir função para ter search_path seguro
CREATE OR REPLACE FUNCTION public.create_stock_financial_record()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Inserir registro financeiro quando um novo item de estoque for criado
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
    'Material Médico'::text,
    'Compra de estoque: ' || NEW.name,
    (NEW.current_quantity * NEW.unit_cost),
    CURRENT_DATE,
    'A definir'::text,
    'Registro automático - Item: ' || NEW.name || 
    ' | Categoria: ' || COALESCE(NEW.category, 'N/A') ||
    ' | Quantidade: ' || NEW.current_quantity ||
    ' | Custo unitário: R$ ' || NEW.unit_cost ||
    ' | Fornecedor: ' || COALESCE(NEW.supplier, 'N/A') ||
    ' | Localização: ' || COALESCE(NEW.location, 'N/A'),
    auth.uid()
  );
  
  RETURN NEW;
END;
$$;