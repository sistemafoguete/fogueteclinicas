-- Desativar os clientes "Tatiana" e "Teste" em vez de excluir
-- Isso mantém a integridade dos dados e histórico
UPDATE public.clients 
SET is_active = false
WHERE (name = 'Tatiana' AND phone = '31985444555')
   OR (name = 'Teste' AND phone = '31984319232');