-- Criar política DELETE para coordenadores e diretores na tabela schedules
CREATE POLICY "Delete schedules with unit access control"
ON public.schedules
FOR DELETE
TO authenticated
USING (
  -- Diretores têm acesso total
  director_has_god_mode()
  
  -- Coordenador Madre pode deletar agendamentos da unidade madre
  OR (
    (unit = 'madre' OR unit IS NULL) 
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.employee_role = 'coordinator_madre'
      AND profiles.is_active = true
    )
  )
  
  -- Coordenador Floresta pode deletar agendamentos da unidade floresta
  OR (
    unit = 'floresta' 
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.employee_role = 'coordinator_floresta'
      AND profiles.is_active = true
    )
  )
  
  -- Coordenador Atendimento Floresta pode deletar sua unidade
  OR (
    unit = 'atendimento_floresta' 
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.employee_role = 'coordinator_atendimento_floresta'
      AND profiles.is_active = true
    )
  )
);