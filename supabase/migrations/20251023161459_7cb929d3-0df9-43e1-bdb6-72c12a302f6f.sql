
-- Deletar os 3 registros de teste do Alan César Guerra
DELETE FROM attendance_reports 
WHERE id IN (
  '6851b919-c796-4208-be81-0b74af268e3e',
  '8e70d11d-3eff-4eca-bf04-e5cf16225cdc',
  'a379a19a-a161-4f1c-ad84-284bcee9d03c'
);
