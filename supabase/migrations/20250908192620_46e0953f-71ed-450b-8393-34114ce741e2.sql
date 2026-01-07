-- Create a test client
INSERT INTO clients (
  name, 
  cpf, 
  birth_date, 
  email, 
  phone, 
  responsible_name, 
  responsible_phone,
  unit, 
  address, 
  diagnosis, 
  medical_history, 
  neuropsych_complaint, 
  treatment_expectations, 
  clinical_observations,
  created_by
) VALUES (
  'Cliente Teste',
  '123.456.789-00',
  '1990-01-01',
  'cliente.teste@example.com',
  '(11) 98765-4321',
  'Contato Teste',
  '(11) 91234-5678',
  'madre',
  'Rua de Teste, 123, Centro, São Paulo / SP, CEP: 01000-000',
  'Nenhum',
  'Nenhum',
  'Nenhum', 
  'Acompanhamento geral.',
  'Este é um cliente de teste para demonstração do sistema.',
  auth.uid()
);

-- Get the client ID and create an assignment for the current user
INSERT INTO client_assignments (client_id, employee_id, assigned_by)
SELECT c.id, auth.uid(), auth.uid()
FROM clients c 
WHERE c.name = 'Cliente Teste' AND c.email = 'cliente.teste@example.com';