-- Adicionar política para permitir ver clientes com feedbacks atribuídos
CREATE POLICY "Staff can view clients with assigned feedbacks"
ON public.clients
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM client_feedback_control cfc
    WHERE cfc.client_id = clients.id 
    AND cfc.assigned_to = auth.uid()
  )
);