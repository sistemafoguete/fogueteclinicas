-- Allow receptionists to view and update schedules for patient arrival confirmation
CREATE POLICY "Receptionists can view schedules for patient arrival" 
ON schedules 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = 'receptionist'::employee_role
    AND is_active = true
  )
);