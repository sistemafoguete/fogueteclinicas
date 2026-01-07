-- Inserir clientes de exemplo
INSERT INTO clients (name, phone, email, birth_date, address, unit, diagnosis, is_active, created_by) VALUES
('Maria Silva Santos', '(11) 98765-4321', 'maria.silva@email.com', '1985-06-15', 'Rua das Flores, 123 - São Paulo, SP', 'madre', 'Ansiedade Generalizada', true, (SELECT user_id FROM profiles LIMIT 1)),
('João Pedro Costa', '(11) 97654-3210', 'joao.costa@email.com', '2010-03-22', 'Av. Paulista, 456 - São Paulo, SP', 'floresta', 'Autismo Leve', true, (SELECT user_id FROM profiles LIMIT 1)),
('Ana Carolina Lima', '(11) 96543-2109', 'ana.lima@email.com', '1990-12-08', 'Rua Augusta, 789 - São Paulo, SP', 'madre', 'Depressão', true, (SELECT user_id FROM profiles LIMIT 1)),
('Carlos Eduardo Santos', '(11) 95432-1098', 'carlos.santos@email.com', '2015-09-30', 'Rua da Consolação, 321 - São Paulo, SP', 'floresta', 'TDAH', true, (SELECT user_id FROM profiles LIMIT 1)),
('Fernanda Oliveira', '(11) 94321-0987', 'fernanda.oliveira@email.com', '1978-04-12', 'Rua Oscar Freire, 654 - São Paulo, SP', 'madre', 'Síndrome do Pânico', true, (SELECT user_id FROM profiles LIMIT 1));

-- Inserir agendamentos de exemplo
INSERT INTO schedules (client_id, employee_id, title, start_time, end_time, status, notes, created_by) VALUES
((SELECT id FROM clients WHERE name = 'Maria Silva Santos'), (SELECT user_id FROM profiles LIMIT 1), 'Consulta Inicial', '2025-01-17 14:00:00+00', '2025-01-17 15:00:00+00', 'scheduled', 'Primeira consulta para avaliação', (SELECT user_id FROM profiles LIMIT 1)),
((SELECT id FROM clients WHERE name = 'João Pedro Costa'), (SELECT user_id FROM profiles LIMIT 1), 'Terapia Comportamental', '2025-01-17 15:30:00+00', '2025-01-17 16:30:00+00', 'scheduled', 'Sessão de terapia comportamental', (SELECT user_id FROM profiles LIMIT 1)),
((SELECT id FROM clients WHERE name = 'Ana Carolina Lima'), (SELECT user_id FROM profiles LIMIT 1), 'Acompanhamento Psicológico', '2025-01-17 16:45:00+00', '2025-01-17 17:45:00+00', 'completed', 'Sessão de acompanhamento mensal', (SELECT user_id FROM profiles LIMIT 1)),
((SELECT id FROM clients WHERE name = 'Carlos Eduardo Santos'), (SELECT user_id FROM profiles LIMIT 1), 'Avaliação Neuropsicológica', '2025-01-18 09:00:00+00', '2025-01-18 11:00:00+00', 'scheduled', 'Avaliação neuropsicológica completa', (SELECT user_id FROM profiles LIMIT 1)),
((SELECT id FROM clients WHERE name = 'Fernanda Oliveira'), (SELECT user_id FROM profiles LIMIT 1), 'Terapia Cognitiva', '2025-01-18 14:00:00+00', '2025-01-18 15:00:00+00', 'scheduled', 'Sessão de terapia cognitivo-comportamental', (SELECT user_id FROM profiles LIMIT 1));

-- Inserir registros financeiros de exemplo
INSERT INTO financial_records (type, category, amount, description, date, payment_method, client_id, created_by) VALUES
('income', 'consultation', 150.00, 'Consulta - Maria Silva Santos', '2025-01-15', 'pix', (SELECT id FROM clients WHERE name = 'Maria Silva Santos'), (SELECT user_id FROM profiles LIMIT 1)),
('income', 'therapy', 120.00, 'Terapia - João Pedro Costa', '2025-01-15', 'credit_card', (SELECT id FROM clients WHERE name = 'João Pedro Costa'), (SELECT user_id FROM profiles LIMIT 1)),
('income', 'consultation', 150.00, 'Acompanhamento - Ana Carolina Lima', '2025-01-16', 'cash', (SELECT id FROM clients WHERE name = 'Ana Carolina Lima'), (SELECT user_id FROM profiles LIMIT 1)),
('expense', 'supplies', 85.50, 'Material para terapias - papel, lápis, jogos', '2025-01-14', 'debit_card', null, (SELECT user_id FROM profiles LIMIT 1)),
('expense', 'equipment', 320.00, 'Compra de material psicopedagógico', '2025-01-12', 'bank_transfer', null, (SELECT user_id FROM profiles LIMIT 1)),
('income', 'evaluation', 200.00, 'Avaliação Neuropsicológica', '2025-01-13', 'pix', (SELECT id FROM clients WHERE name = 'Carlos Eduardo Santos'), (SELECT user_id FROM profiles LIMIT 1));

-- Inserir itens de estoque de exemplo
INSERT INTO stock_items (name, description, category, current_quantity, minimum_quantity, unit_cost, unit, supplier, location, is_active, created_by) VALUES
('Papel Sulfite A4', 'Papel sulfite branco A4 para atividades', 'Material Escrito', 50, 10, 25.00, 'pacote', 'Papelaria Central', 'Almoxarifado', true, (SELECT user_id FROM profiles LIMIT 1)),
('Lápis de Cor', 'Caixa com 12 lápis de cor', 'Material Artístico', 25, 5, 15.00, 'caixa', 'Papelaria Central', 'Sala de Terapia', true, (SELECT user_id FROM profiles LIMIT 1)),
('Quebra-cabeça Infantil', 'Quebra-cabeça educativo 24 peças', 'Jogos Pedagógicos', 8, 3, 35.00, 'unidade', 'Brinquedos Educativos Ltda', 'Sala de Terapia', true, (SELECT user_id FROM profiles LIMIT 1)),
('Massinha de Modelar', 'Kit com 6 cores de massinha', 'Material Sensorial', 15, 5, 12.00, 'kit', 'Material Pedagógico SP', 'Sala de Terapia', true, (SELECT user_id FROM profiles LIMIT 1)),
('Cartolina Colorida', 'Cartolina colorida para atividades', 'Material Artístico', 30, 8, 8.00, 'pacote', 'Papelaria Central', 'Almoxarifado', true, (SELECT user_id FROM profiles LIMIT 1));

-- Inserir client_assignments para vincular clientes aos funcionários
INSERT INTO client_assignments (client_id, employee_id, assigned_by, is_active) VALUES
((SELECT id FROM clients WHERE name = 'Maria Silva Santos'), (SELECT user_id FROM profiles LIMIT 1), (SELECT user_id FROM profiles LIMIT 1), true),
((SELECT id FROM clients WHERE name = 'João Pedro Costa'), (SELECT user_id FROM profiles LIMIT 1), (SELECT user_id FROM profiles LIMIT 1), true),
((SELECT id FROM clients WHERE name = 'Ana Carolina Lima'), (SELECT user_id FROM profiles LIMIT 1), (SELECT user_id FROM profiles LIMIT 1), true),
((SELECT id FROM clients WHERE name = 'Carlos Eduardo Santos'), (SELECT user_id FROM profiles LIMIT 1), (SELECT user_id FROM profiles LIMIT 1), true),
((SELECT id FROM clients WHERE name = 'Fernanda Oliveira'), (SELECT user_id FROM profiles LIMIT 1), (SELECT user_id FROM profiles LIMIT 1), true);

-- Inserir algumas notas financeiras
INSERT INTO financial_notes (note_date, note_text, note_type, created_by) VALUES
('2025-01-17', 'Mês iniciando com boa procura pelos serviços. Aumentamos o número de consultas em 15%.', 'daily', (SELECT user_id FROM profiles LIMIT 1)),
('2025-01-16', 'Compra de novos materiais pedagógicos para as terapias. Investimento necessário para melhor qualidade dos atendimentos.', 'daily', (SELECT user_id FROM profiles LIMIT 1)),
('2025-01-15', 'Receitas do dia dentro do esperado. Três atendimentos realizados com sucesso.', 'daily', (SELECT user_id FROM profiles LIMIT 1));