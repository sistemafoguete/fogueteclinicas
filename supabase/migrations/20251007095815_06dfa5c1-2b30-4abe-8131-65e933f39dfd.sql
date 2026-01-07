-- Adicionar campos para registro manual flexível de pagamentos
ALTER TABLE public.client_payments
ADD COLUMN IF NOT EXISTS credit_card_installments INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS down_payment_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS down_payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_combination JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Comentários explicativos
COMMENT ON COLUMN public.client_payments.credit_card_installments IS 'Número de parcelas no cartão de crédito';
COMMENT ON COLUMN public.client_payments.down_payment_amount IS 'Valor da entrada pago';
COMMENT ON COLUMN public.client_payments.down_payment_method IS 'Método de pagamento da entrada (dinheiro, pix, etc)';
COMMENT ON COLUMN public.client_payments.payment_combination IS 'Array com combinações de pagamento: entrada + parcelamento, múltiplos métodos, etc';
COMMENT ON COLUMN public.client_payments.notes IS 'Observações sobre o pagamento';