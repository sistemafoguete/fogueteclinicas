-- Insert sample financial data
INSERT INTO financial_records (type, category, amount, description, date, payment_method, created_by) VALUES
('income', 'consultation', 150.00, 'Consulta - Avaliação Neuropsicológica', '2025-01-08', 'pix', auth.uid()),
('income', 'therapy', 120.00, 'Sessão de Terapia Cognitiva', '2025-01-07', 'credit_card', auth.uid()),
('income', 'evaluation', 200.00, 'Avaliação Completa - Adulto', '2025-01-06', 'cash', auth.uid()),
('expense', 'supplies', 85.50, 'Material para testes psicológicos', '2025-01-05', 'debit_card', auth.uid()),
('income', 'consultation', 150.00, 'Consulta de Retorno', '2025-01-04', 'pix', auth.uid()),
('expense', 'equipment', 320.00, 'Equipamento de áudio para terapia', '2025-01-03', 'bank_transfer', auth.uid()),
('income', 'therapy', 120.00, 'Sessão Individual', '2025-01-02', 'cash', auth.uid()),
('expense', 'utilities', 180.00, 'Conta de luz do consultório', '2025-01-01', 'debit_card', auth.uid()),
('income', 'consultation', 150.00, 'Primeira consulta', '2024-12-30', 'pix', auth.uid()),
('expense', 'supplies', 45.00, 'Material de escritório', '2024-12-29', 'cash', auth.uid());