-- Inserir clientes de exemplo
INSERT INTO clients (name, phone, email, birth_date, address, unit, diagnosis, is_active, created_by) VALUES
('Maria Silva Santos', '(11) 98765-4321', 'maria.silva@email.com', '1985-06-15', 'Rua das Flores, 123 - São Paulo, SP', 'madre', 'Ansiedade Generalizada', true, '39330e2a-a611-4144-9280-600013d1dbd0'),
('João Pedro Costa', '(11) 97654-3210', 'joao.costa@email.com', '2010-03-22', 'Av. Paulista, 456 - São Paulo, SP', 'floresta', 'Autismo Leve', true, '39330e2a-a611-4144-9280-600013d1dbd0'),
('Ana Carolina Lima', '(11) 96543-2109', 'ana.lima@email.com', '1990-12-08', 'Rua Augusta, 789 - São Paulo, SP', 'madre', 'Depressão', true, '39330e2a-a611-4144-9280-600013d1dbd0'),
('Carlos Eduardo Santos', '(11) 95432-1098', 'carlos.santos@email.com', '2015-09-30', 'Rua da Consolação, 321 - São Paulo, SP', 'floresta', 'TDAH', true, '39330e2a-a611-4144-9280-600013d1dbd0'),
('Fernanda Oliveira', '(11) 94321-0987', 'fernanda.oliveira@email.com', '1978-04-12', 'Rua Oscar Freire, 654 - São Paulo, SP', 'madre', 'Síndrome do Pânico', true, '39330e2a-a611-4144-9280-600013d1dbd0');

-- Inserir registros financeiros de exemplo
INSERT INTO financial_records (type, category, amount, description, date, payment_method, client_id, created_by) VALUES
('income', 'consultation', 150.00, 'Consulta - Maria Silva Santos', '2025-01-15', 'pix', (SELECT id FROM clients WHERE name = 'Maria Silva Santos'), '39330e2a-a611-4144-9280-600013d1dbd0'),
('income', 'therapy', 120.00, 'Terapia - João Pedro Costa', '2025-01-15', 'credit_card', (SELECT id FROM clients WHERE name = 'João Pedro Costa'), '39330e2a-a611-4144-9280-600013d1dbd0'),
('income', 'consultation', 150.00, 'Acompanhamento - Ana Carolina Lima', '2025-01-16', 'cash', (SELECT id FROM clients WHERE name = 'Ana Carolina Lima'), '39330e2a-a611-4144-9280-600013d1dbd0'),
('expense', 'supplies', 85.50, 'Material para terapias - papel, lápis, jogos', '2025-01-14', 'debit_card', null, '39330e2a-a611-4144-9280-600013d1dbd0'),
('expense', 'equipment', 320.00, 'Compra de material psicopedagógico', '2025-01-12', 'bank_transfer', null, '39330e2a-a611-4144-9280-600013d1dbd0'),
('income', 'evaluation', 200.00, 'Avaliação Neuropsicológica', '2025-01-13', 'pix', (SELECT id FROM clients WHERE name = 'Carlos Eduardo Santos'), '39330e2a-a611-4144-9280-600013d1dbd0');

-- Inserir itens de estoque de exemplo
INSERT INTO stock_items (name, description, category, current_quantity, minimum_quantity, unit_cost, unit, supplier, location, is_active, created_by) VALUES
('Papel Sulfite A4', 'Papel sulfite branco A4 para atividades', 'Material Escrito', 50, 10, 25.00, 'pacote', 'Papelaria Central', 'Almoxarifado', true, '39330e2a-a611-4144-9280-600013d1dbd0'),
('Lápis de Cor', 'Caixa com 12 lápis de cor', 'Material Artístico', 25, 5, 15.00, 'caixa', 'Papelaria Central', 'Sala de Terapia', true, '39330e2a-a611-4144-9280-600013d1dbd0'),
('Quebra-cabeça Infantil', 'Quebra-cabeça educativo 24 peças', 'Jogos Pedagógicos', 8, 3, 35.00, 'unidade', 'Brinquedos Educativos Ltda', 'Sala de Terapia', true, '39330e2a-a611-4144-9280-600013d1dbd0'),
('Massinha de Modelar', 'Kit com 6 cores de massinha', 'Material Sensorial', 15, 5, 12.00, 'kit', 'Material Pedagógico SP', 'Sala de Terapia', true, '39330e2a-a611-4144-9280-600013d1dbd0'),
('Cartolina Colorida', 'Cartolina colorida para atividades', 'Material Artístico', 30, 8, 8.00, 'pacote', 'Papelaria Central', 'Almoxarifado', true, '39330e2a-a611-4144-9280-600013d1dbd0');

-- Inserir client_assignments para vincular clientes aos funcionários
INSERT INTO client_assignments (client_id, employee_id, assigned_by, is_active) VALUES
((SELECT id FROM clients WHERE name = 'Maria Silva Santos'), '39330e2a-a611-4144-9280-600013d1dbd0', '39330e2a-a611-4144-9280-600013d1dbd0', true),
((SELECT id FROM clients WHERE name = 'João Pedro Costa'), '39330e2a-a611-4144-9280-600013d1dbd0', '39330e2a-a611-4144-9280-600013d1dbd0', true),
((SELECT id FROM clients WHERE name = 'Ana Carolina Lima'), '39330e2a-a611-4144-9280-600013d1dbd0', '39330e2a-a611-4144-9280-600013d1dbd0', true),
((SELECT id FROM clients WHERE name = 'Carlos Eduardo Santos'), '39330e2a-a611-4144-9280-600013d1dbd0', '39330e2a-a611-4144-9280-600013d1dbd0', true),
((SELECT id FROM clients WHERE name = 'Fernanda Oliveira'), '39330e2a-a611-4144-9280-600013d1dbd0', '39330e2a-a611-4144-9280-600013d1dbd0', true);

-- Inserir algumas notas financeiras
INSERT INTO financial_notes (note_date, note_text, note_type, created_by) VALUES
('2025-01-17', 'Mês iniciando com boa procura pelos serviços. Aumentamos o número de consultas em 15%.', 'daily', '39330e2a-a611-4144-9280-600013d1dbd0'),
('2025-01-16', 'Compra de novos materiais pedagógicos para as terapias. Investimento necessário para melhor qualidade dos atendimentos.', 'daily', '39330e2a-a611-4144-9280-600013d1dbd0'),
('2025-01-15', 'Receitas do dia dentro do esperado. Três atendimentos realizados com sucesso.', 'daily', '39330e2a-a611-4144-9280-600013d1dbd0');