-- Limpar dados existentes que podem estar causando problemas
DELETE FROM schedules;

-- Inserir agendamentos de exemplo
INSERT INTO schedules (client_id, employee_id, title, start_time, end_time, status, notes, created_by) VALUES
((SELECT id FROM clients WHERE name = 'Maria Silva Santos' LIMIT 1), '39330e2a-a611-4144-9280-600013d1dbd0', 'Consulta Inicial', '2025-01-17 14:00:00+00', '2025-01-17 15:00:00+00', 'scheduled', 'Primeira consulta para avaliação', '39330e2a-a611-4144-9280-600013d1dbd0'),
((SELECT id FROM clients WHERE name = 'João Pedro Costa' LIMIT 1), '39330e2a-a611-4144-9280-600013d1dbd0', 'Terapia Comportamental', '2025-01-17 15:30:00+00', '2025-01-17 16:30:00+00', 'scheduled', 'Sessão de terapia comportamental', '39330e2a-a611-4144-9280-600013d1dbd0'),
((SELECT id FROM clients WHERE name = 'Ana Carolina Lima' LIMIT 1), '39330e2a-a611-4144-9280-600013d1dbd0', 'Acompanhamento Psicológico', '2025-01-17 16:45:00+00', '2025-01-17 17:45:00+00', 'completed', 'Sessão de acompanhamento mensal', '39330e2a-a611-4144-9280-600013d1dbd0'),
((SELECT id FROM clients WHERE name = 'Carlos Eduardo Santos' LIMIT 1), '39330e2a-a611-4144-9280-600013d1dbd0', 'Avaliação Neuropsicológica', '2025-01-18 09:00:00+00', '2025-01-18 11:00:00+00', 'scheduled', 'Avaliação neuropsicológica completa', '39330e2a-a611-4144-9280-600013d1dbd0'),
((SELECT id FROM clients WHERE name = 'Fernanda Oliveira' LIMIT 1), '39330e2a-a611-4144-9280-600013d1dbd0', 'Terapia Cognitiva', '2025-01-18 14:00:00+00', '2025-01-18 15:00:00+00', 'scheduled', 'Sessão de terapia cognitivo-comportamental', '39330e2a-a611-4144-9280-600013d1dbd0');