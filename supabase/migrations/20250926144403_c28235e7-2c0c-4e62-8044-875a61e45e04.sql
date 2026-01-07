-- Enable real-time for schedules table to support patient arrival notifications
ALTER TABLE schedules REPLICA IDENTITY FULL;

-- Ensure RLS policy allows recepcionistas to update patient_arrived status
CREATE POLICY "Receptionists can update patient arrival status" 
ON schedules 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = 'receptionist'::employee_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = 'receptionist'::employee_role
  )
);