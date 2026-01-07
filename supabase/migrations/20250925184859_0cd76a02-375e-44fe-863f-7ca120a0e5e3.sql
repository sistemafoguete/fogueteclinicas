-- Criar função para registrar automaticamente item de estoque no financeiro
CREATE OR REPLACE FUNCTION public.create_stock_financial_record()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para executar a função quando um item de estoque for inserido
CREATE TRIGGER stock_item_to_financial
  AFTER INSERT ON public.stock_items
  FOR EACH ROW
  EXECUTE FUNCTION public.create_stock_financial_record();