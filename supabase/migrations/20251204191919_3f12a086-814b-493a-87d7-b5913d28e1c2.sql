-- Drop existing INSERT policy if exists
DROP POLICY IF EXISTS "Users can create notifications for appointments they manage" ON public.appointment_notifications;
DROP POLICY IF EXISTS "Directors and coordinators can create notifications" ON public.appointment_notifications;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.appointment_notifications;

-- Create new INSERT policy allowing directors and coordinators to create notifications
CREATE POLICY "Directors and coordinators can create notifications"
ON public.appointment_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.employee_role IN ('director', 'coordinator_floresta', 'coordinator_madre', 'coordinator_atendimento_floresta')
    AND profiles.is_active = true
  )
  OR created_by = auth.uid()
);

-- Ensure SELECT policy exists for reading notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.appointment_notifications;

CREATE POLICY "Users can view relevant notifications"
ON public.appointment_notifications
FOR SELECT
TO authenticated
USING (
  employee_id = auth.uid()
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.employee_role IN ('director', 'coordinator_floresta', 'coordinator_madre', 'coordinator_atendimento_floresta')
    AND profiles.is_active = true
  )
);