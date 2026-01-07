-- Create table for daily financial notes
CREATE TABLE public.financial_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note_text TEXT NOT NULL,
  note_type TEXT DEFAULT 'daily',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for financial notes
CREATE POLICY "Directors can manage all financial notes" 
ON public.financial_notes 
FOR ALL 
USING (user_has_role(ARRAY['director'::employee_role]));

CREATE POLICY "Users can view financial notes" 
ON public.financial_notes 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Create trigger for timestamps
CREATE TRIGGER update_financial_notes_updated_at
BEFORE UPDATE ON public.financial_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add some sample financial notes
INSERT INTO financial_notes (note_date, note_text, created_by) VALUES
('2025-01-08', 'Dia com bom movimento de consultas. Meta mensal está sendo cumprida.', auth.uid()),
('2025-01-07', 'Compra de novos materiais para testes. Investimento necessário.', auth.uid()),
('2025-01-06', 'Recebimento de pagamentos em dia. Fluxo de caixa positivo.', auth.uid());