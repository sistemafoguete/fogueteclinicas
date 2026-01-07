-- Corrigir políticas RLS da tabela profiles que causam recursão infinita
-- Remover políticas problemáticas
DROP POLICY IF EXISTS "Directors can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Directors can update all profiles" ON profiles;

-- Criar novas políticas usando as funções seguras
CREATE POLICY "Directors can view all profiles" 
ON profiles 
FOR SELECT 
USING (user_has_role(ARRAY['director'::employee_role]));

CREATE POLICY "Directors can update all profiles" 
ON profiles 
FOR UPDATE 
USING (user_has_role(ARRAY['director'::employee_role]));