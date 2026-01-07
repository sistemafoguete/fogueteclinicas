-- Create sample employees with matching login/password using only existing role enum values
-- First, let's create some employee profiles

-- Insert sample employee profiles with different roles (using only existing enum values)
INSERT INTO public.profiles (
  user_id,
  name,
  employee_role,
  phone,
  document_cpf,
  document_rg,
  hire_date,
  department,
  salary,
  is_active
) VALUES
-- Director
('11111111-1111-1111-1111-111111111111', 'Dr. Maria Silva', 'director', '(11) 99999-1111', '111.111.111-11', 'MG-11.111.111', '2020-01-15', 'Administração', 15000.00, true),

-- Coordinators  
('22222222-2222-2222-2222-222222222222', 'Dra. Ana Santos', 'coordinator_madre', '(11) 99999-2222', '222.222.222-22', 'SP-22.222.222', '2021-03-10', 'Coordenação Madre', 8000.00, true),
('33333333-3333-3333-3333-333333333333', 'Dr. Carlos Lima', 'coordinator_floresta', '(11) 99999-3333', '333.333.333-33', 'RJ-33.333.333', '2021-06-20', 'Coordenação Floresta', 8000.00, true),

-- Therapists
('44444444-4444-4444-4444-444444444444', 'Fisioterapeuta Lucia Pereira', 'therapist', '(11) 99999-4444', '444.444.444-44', 'PR-44.444.444', '2022-02-01', 'Fisioterapia', 6000.00, true),
('55555555-5555-5555-5555-555555555555', 'Psicoterapeuta Roberto Alves', 'therapist', '(11) 99999-5555', '555.555.555-55', 'RS-55.555.555', '2022-05-15', 'Psicoterapia', 6000.00, true),

-- Administrative Staff
('66666666-6666-6666-6666-666666666666', 'Recepcionista Carla Souza', 'administrative', '(11) 99999-6666', '666.666.666-66', 'SC-66.666.666', '2021-08-30', 'Recepção', 3500.00, true),
('77777777-7777-7777-7777-777777777777', 'Assistente Marcos Ferreira', 'administrative', '(11) 99999-7777', '777.777.777-77', 'GO-77.777.777', '2022-01-10', 'Administrativo', 3500.00, true),

-- Staff
('88888888-8888-8888-8888-888888888888', 'Auxiliar Sandra Rodrigues', 'staff', '(11) 99999-8888', '888.888.888-88', 'MT-88.888.888', '2022-07-01', 'Auxiliar Geral', 2800.00, true),
('99999999-9999-9999-9999-999999999999', 'Enfermeiro João Oliveira', 'staff', '(11) 99999-9999', '999.999.999-99', 'BA-99.999.999', '2022-09-15', 'Enfermagem', 3800.00, true),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Técnica Paula Costa', 'staff', '(11) 99999-aaaa', '111.222.333-44', 'CE-11.222.333', '2022-11-01', 'Técnica em Enfermagem', 3200.00, true);

-- Create corresponding employee records
INSERT INTO public.employees (
  user_id,
  profile_id,
  employee_code,
  specialization,
  professional_license,
  work_schedule
) 
SELECT 
  p.user_id,
  p.id as profile_id,
  'EMP' || LPAD(EXTRACT(YEAR FROM NOW())::TEXT, 4, '0') || LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0') || LPAD((ROW_NUMBER() OVER(ORDER BY p.name))::TEXT, 4, '0') as employee_code,
  CASE 
    WHEN p.name LIKE '%Fisio%' THEN 'Fisioterapia'
    WHEN p.name LIKE '%Psico%' THEN 'Psicoterapia'  
    WHEN p.name LIKE '%Enferm%' OR p.name LIKE '%Técnica%' THEN 'Enfermagem'
    WHEN p.employee_role IN ('director', 'coordinator_madre', 'coordinator_floresta') THEN 'Gestão'
    ELSE 'Geral'
  END as specialization,
  CASE 
    WHEN p.name LIKE '%Fisio%' THEN 'CREFITO-123456'
    WHEN p.name LIKE '%Psico%' THEN 'CRP-654321'
    WHEN p.name LIKE '%Enferm%' OR p.name LIKE '%Técnica%' THEN 'COREN-789012'
    ELSE NULL
  END as professional_license,
  '{"monday": {"start": "08:00", "end": "17:00"}, "tuesday": {"start": "08:00", "end": "17:00"}, "wednesday": {"start": "08:00", "end": "17:00"}, "thursday": {"start": "08:00", "end": "17:00"}, "friday": {"start": "08:00", "end": "17:00"}}'::jsonb as work_schedule
FROM public.profiles p
WHERE p.user_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222', 
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777',
  '88888888-8888-8888-8888-888888888888',
  '99999999-9999-9999-9999-999999999999',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
);

-- Create some sample clients for testing
INSERT INTO public.clients (
  name,
  email,
  phone,
  cpf,
  birth_date,
  address,
  emergency_contact,
  emergency_phone,
  medical_history,
  is_active
) VALUES
('João da Silva', 'joao.silva@email.com', '(11) 98765-4321', '123.456.789-10', '1985-03-15', 'Rua das Flores, 123 - São Paulo/SP', 'Maria da Silva', '(11) 98765-1234', 'Histórico de hipertensão', true),
('Maria Oliveira', 'maria.oliveira@email.com', '(11) 97654-3210', '987.654.321-09', '1990-07-22', 'Av. Paulista, 456 - São Paulo/SP', 'José Oliveira', '(11) 97654-9876', 'Diabetes tipo 2', true),
('Pedro Santos', 'pedro.santos@email.com', '(11) 96543-2109', '456.789.123-45', '1978-12-10', 'Rua da Consolação, 789 - São Paulo/SP', 'Ana Santos', '(11) 96543-6543', 'Nenhum histórico relevante', true),
('Ana Costa', 'ana.costa@email.com', '(11) 95432-1098', '789.123.456-78', '1995-05-30', 'Rua Augusta, 321 - São Paulo/SP', 'Carlos Costa', '(11) 95432-5432', 'Alergia a penicilina', true);

-- Create some sample stock items
INSERT INTO public.stock_items (
  name,
  category,
  current_quantity,
  minimum_quantity,
  unit,
  unit_cost,
  supplier,
  description,
  is_active
) VALUES
('Luvas Descartáveis', 'medical_supplies', 500, 50, 'cx', 25.90, 'Med Supply Ltda', 'Caixa com 100 unidades', true),
('Seringas 5ml', 'medical_supplies', 200, 30, 'cx', 45.50, 'Med Supply Ltda', 'Caixa com 50 unidades', true),
('Álcool em Gel 70%', 'cleaning', 80, 10, 'l', 12.90, 'Limpeza Pro', '1 litro', true),
('Papel A4', 'office_supplies', 25, 5, 'pct', 28.00, 'Papelaria Central', 'Pacote com 500 folhas', true),
('Termômetro Digital', 'equipment', 15, 3, 'un', 89.90, 'Equipamentos Médicos SA', 'Termômetro digital infravermelho', true);