-- Corrigir função update_stock_updated_at com search_path seguro
CREATE OR REPLACE FUNCTION public.update_stock_updated_at()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;