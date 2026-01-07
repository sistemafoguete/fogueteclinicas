-- Adicionar política para diretores e coordenadores verem todos os logs de auditoria
CREATE POLICY "Directors and coordinators can view all audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND employee_role IN ('director', 'coordinator_madre', 'coordinator_floresta')
    AND is_active = true
  )
);