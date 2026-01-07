-- Criar bucket para laudos
INSERT INTO storage.buckets (id, name, public)
VALUES ('laudos', 'laudos', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para o bucket de laudos
CREATE POLICY "Diretores e coordenadores podem visualizar laudos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'laudos' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND employee_role IN ('director', 'coordinator_floresta', 'coordinator_madre')
    AND is_active = true
  )
);

CREATE POLICY "Diretores e coordenadores podem fazer upload de laudos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'laudos' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND employee_role IN ('director', 'coordinator_floresta')
    AND is_active = true
  )
);

CREATE POLICY "Diretores e coordenadores podem atualizar laudos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'laudos' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND employee_role IN ('director', 'coordinator_floresta')
    AND is_active = true
  )
);

CREATE POLICY "Diretores e coordenadores podem deletar laudos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'laudos' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND employee_role IN ('director', 'coordinator_floresta')
    AND is_active = true
  )
);

-- Adicionar coluna para armazenar caminho do laudo
ALTER TABLE public.client_feedback_control
ADD COLUMN IF NOT EXISTS laudo_file_path TEXT;

-- Função para processar conclusão de devolutiva
CREATE OR REPLACE FUNCTION complete_feedback_with_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se um laudo foi anexado
  IF NEW.laudo_file_path IS NOT NULL AND OLD.laudo_file_path IS NULL THEN
    -- Marcar como report_attached
    NEW.report_attached := true;
    NEW.status := 'completed';
    NEW.completed_at := NOW();
    NEW.completed_by := auth.uid();
    
    -- Marcar cliente como inativo
    UPDATE public.clients
    SET is_active = false
    WHERE id = NEW.client_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para completar devolutiva automaticamente
DROP TRIGGER IF EXISTS trigger_complete_feedback_on_report ON public.client_feedback_control;
CREATE TRIGGER trigger_complete_feedback_on_report
BEFORE UPDATE ON public.client_feedback_control
FOR EACH ROW
EXECUTE FUNCTION complete_feedback_with_report();