-- Adicionar política RLS para INSERT em appointment_notifications
-- Permitir que coordenadores e diretores criem notificações

CREATE POLICY "Coordinators and directors can create appointment notifications"
ON public.appointment_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- Permitir se o usuário é diretor ou coordenador
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND employee_role IN ('director', 'coordinator_madre', 'coordinator_floresta')
    AND is_active = true
  )
);