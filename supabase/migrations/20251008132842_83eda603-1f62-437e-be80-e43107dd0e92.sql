-- Adicionar policy para permitir staff criar attendance reports
CREATE POLICY "Staff can create attendance reports"
ON public.attendance_reports
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

-- Adicionar policy para permitir staff atualizar seus attendance reports
CREATE POLICY "Staff can update attendance reports"
ON public.attendance_reports
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid() 
  OR completed_by = auth.uid()
  OR director_has_god_mode()
)
WITH CHECK (
  created_by = auth.uid() 
  OR completed_by = auth.uid()
  OR director_has_god_mode()
);

COMMENT ON POLICY "Staff can create attendance reports" ON public.attendance_reports IS 
'Permite que funcionários ativos criem relatórios de atendimento ao concluir sessões';

COMMENT ON POLICY "Staff can update attendance reports" ON public.attendance_reports IS 
'Permite que funcionários atualizem seus próprios relatórios ou diretores tenham acesso completo';