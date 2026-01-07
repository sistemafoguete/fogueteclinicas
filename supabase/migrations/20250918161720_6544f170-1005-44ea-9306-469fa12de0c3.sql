-- Testar a função create_employee_direct
SELECT public.create_employee_direct(
  'teste@teste.com',
  'teste123',
  'Usuário Teste',
  'staff'::employee_role,
  '11999999999',
  'TI'
);