-- Add some sample notes for the test client
INSERT INTO client_notes (client_id, note_text, note_type, created_by)
SELECT c.id, 'Primeira sessão realizada com sucesso. Cliente demonstrou boa colaboração.', 'session', auth.uid()
FROM clients c 
WHERE c.name = 'Cliente Teste' AND c.email = 'cliente.teste@example.com';

INSERT INTO client_notes (client_id, note_text, note_type, created_by)
SELECT c.id, 'Cliente relatou melhora no sono após as primeiras intervenções.', 'progress', auth.uid()
FROM clients c 
WHERE c.name = 'Cliente Teste' AND c.email = 'cliente.teste@example.com';

-- Add some sample documents for the test client
INSERT INTO client_documents (client_id, document_name, document_type, uploaded_by)
SELECT c.id, 'Avaliação Inicial.pdf', 'assessment', auth.uid()
FROM clients c 
WHERE c.name = 'Cliente Teste' AND c.email = 'cliente.teste@example.com';

INSERT INTO client_documents (client_id, document_name, document_type, uploaded_by)
SELECT c.id, 'Relatório de Progresso.docx', 'report', auth.uid()
FROM clients c 
WHERE c.name = 'Cliente Teste' AND c.email = 'cliente.teste@example.com';