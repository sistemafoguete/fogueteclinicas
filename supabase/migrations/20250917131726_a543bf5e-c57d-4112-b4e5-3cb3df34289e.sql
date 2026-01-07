-- Verificar e remover foreign key constraint problemática
ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_employee_id_fkey;

-- Recriar a constraint corretamente referenciando user_id da tabela profiles
ALTER TABLE schedules ADD CONSTRAINT schedules_employee_id_fkey 
  FOREIGN KEY (employee_id) REFERENCES profiles(user_id) ON DELETE CASCADE;