-- Adicionar coluna de unidade na tabela schedules
ALTER TABLE public.schedules 
ADD COLUMN unit text DEFAULT 'madre' CHECK (unit IN ('madre', 'floresta'));

-- Comentário na coluna para documentação
COMMENT ON COLUMN public.schedules.unit IS 'Unidade onde o atendimento será realizado: madre (Clínica Social) ou floresta (Neuro)';

-- Atualizar registros existentes para ter uma unidade padrão baseada no cliente
UPDATE public.schedules 
SET unit = COALESCE(
  (SELECT c.unit FROM public.clients c WHERE c.id = schedules.client_id), 
  'madre'
);

-- Criar índice para performance
CREATE INDEX idx_schedules_unit ON public.schedules(unit);

-- Atualizar permissões de relatório para permitir acesso mais amplo
-- Atualizar função para verificar permissões de relatório
CREATE OR REPLACE FUNCTION public.can_access_reports()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND employee_role IN (
      'director'::employee_role, 
      'coordinator_madre'::employee_role, 
      'coordinator_floresta'::employee_role,
      'financeiro'::employee_role,
      'psychologist'::employee_role,
      'psychopedagogue'::employee_role,
      'speech_therapist'::employee_role,
      'nutritionist'::employee_role,
      'physiotherapist'::employee_role,
      'musictherapist'::employee_role
    )
  );
$$;