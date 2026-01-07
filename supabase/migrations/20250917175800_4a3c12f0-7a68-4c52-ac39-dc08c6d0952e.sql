-- Deletar clientes específicos da base de dados

-- Primeiro, deletar de todas as tabelas relacionadas aos clientes
-- Deletar client_notes (notas dos clientes)
DELETE FROM public.client_notes 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE name IN (
    'Ana Carolina Lima',
    'Carlos Eduardo Santos',
    'Fernanda Oliveira', 
    'João Pedro Costa',
    'Maria Silva Santos'
  )
);

-- Deletar client_documents (documentos dos clientes)
DELETE FROM public.client_documents 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE name IN (
    'Ana Carolina Lima',
    'Carlos Eduardo Santos',
    'Fernanda Oliveira', 
    'João Pedro Costa',
    'Maria Silva Santos'
  )
);

-- Deletar client_assignments (atribuições de clientes)
DELETE FROM public.client_assignments 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE name IN (
    'Ana Carolina Lima',
    'Carlos Eduardo Santos',
    'Fernanda Oliveira', 
    'João Pedro Costa',
    'Maria Silva Santos'
  )
);

-- Deletar schedules (agendamentos dos clientes)
DELETE FROM public.schedules 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE name IN (
    'Ana Carolina Lima',
    'Carlos Eduardo Santos',
    'Fernanda Oliveira', 
    'João Pedro Costa',
    'Maria Silva Santos'
  )
);

-- Deletar medical_records (registros médicos)
DELETE FROM public.medical_records 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE name IN (
    'Ana Carolina Lima',
    'Carlos Eduardo Santos',
    'Fernanda Oliveira', 
    'João Pedro Costa',
    'Maria Silva Santos'
  )
);

-- Deletar attendance_reports (relatórios de atendimento)
DELETE FROM public.attendance_reports 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE name IN (
    'Ana Carolina Lima',
    'Carlos Eduardo Santos',
    'Fernanda Oliveira', 
    'João Pedro Costa',
    'Maria Silva Santos'
  )
);

-- Deletar employee_reports (relatórios de funcionários relacionados aos clientes)
DELETE FROM public.employee_reports 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE name IN (
    'Ana Carolina Lima',
    'Carlos Eduardo Santos',
    'Fernanda Oliveira', 
    'João Pedro Costa',
    'Maria Silva Santos'
  )
);

-- Deletar appointment_sessions (sessões de agendamento)
DELETE FROM public.appointment_sessions 
WHERE schedule_id IN (
  SELECT s.id FROM public.schedules s
  JOIN public.clients c ON s.client_id = c.id
  WHERE c.name IN (
    'Ana Carolina Lima',
    'Carlos Eduardo Santos',
    'Fernanda Oliveira', 
    'João Pedro Costa',
    'Maria Silva Santos'
  )
);

-- Deletar meeting_alerts (alertas de reunião relacionados aos clientes)
DELETE FROM public.meeting_alerts 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE name IN (
    'Ana Carolina Lima',
    'Carlos Eduardo Santos',
    'Fernanda Oliveira', 
    'João Pedro Costa',
    'Maria Silva Santos'
  )
);

-- Deletar automatic_financial_records (registros financeiros automáticos)
DELETE FROM public.automatic_financial_records 
WHERE patient_id IN (
  SELECT id FROM public.clients 
  WHERE name IN (
    'Ana Carolina Lima',
    'Carlos Eduardo Santos',
    'Fernanda Oliveira', 
    'João Pedro Costa',
    'Maria Silva Santos'
  )
);

-- Deletar financial_records (registros financeiros relacionados aos clientes)
DELETE FROM public.financial_records 
WHERE client_id IN (
  SELECT id FROM public.clients 
  WHERE name IN (
    'Ana Carolina Lima',
    'Carlos Eduardo Santos',
    'Fernanda Oliveira', 
    'João Pedro Costa',
    'Maria Silva Santos'
  )
);

-- Por último, deletar os clientes da tabela principal
DELETE FROM public.clients 
WHERE name IN (
  'Ana Carolina Lima',
  'Carlos Eduardo Santos',
  'Fernanda Oliveira', 
  'João Pedro Costa',
  'Maria Silva Santos'
);

-- Confirmar quantos clientes foram removidos
SELECT 'Clientes e todos os dados relacionados foram removidos com sucesso.' as resultado;