-- Criar tabela de receitas/prescrições
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL,
  schedule_id UUID REFERENCES public.schedules(id),
  prescription_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Medicamentos (JSONB array)
  -- Estrutura: [{ name: string, dosage: string, frequency: string, duration: string, instructions: string }]
  medications JSONB DEFAULT '[]'::jsonb,
  
  -- Informações complementares
  diagnosis TEXT,
  general_instructions TEXT,
  follow_up_notes TEXT,
  
  -- Controle
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_prescriptions_client_id ON public.prescriptions(client_id);
CREATE INDEX idx_prescriptions_employee_id ON public.prescriptions(employee_id);
CREATE INDEX idx_prescriptions_date ON public.prescriptions(prescription_date DESC);

-- Habilitar RLS
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Employees can view all prescriptions" 
ON public.prescriptions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Employees can insert prescriptions" 
ON public.prescriptions 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Employees can update prescriptions" 
ON public.prescriptions 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Employees can delete prescriptions" 
ON public.prescriptions 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_prescriptions_updated_at
BEFORE UPDATE ON public.prescriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();