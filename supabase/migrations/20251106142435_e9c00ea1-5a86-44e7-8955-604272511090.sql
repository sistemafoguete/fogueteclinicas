-- Corrigir políticas RLS para client_documents
-- Remover as políticas antigas
DROP POLICY IF EXISTS "Staff can manage documents of assigned clients" ON client_documents;
DROP POLICY IF EXISTS "Staff can view documents of assigned clients" ON client_documents;

-- Criar política para visualizar documentos
CREATE POLICY "Staff can view documents of assigned clients"
ON client_documents
FOR SELECT
USING (
  (EXISTS (
    SELECT 1
    FROM client_assignments ca
    WHERE ca.client_id = client_documents.client_id 
      AND ca.employee_id = auth.uid() 
      AND ca.is_active = true
  )) 
  OR director_has_god_mode()
);

-- Criar política para inserir documentos
CREATE POLICY "Staff can insert documents for assigned clients"
ON client_documents
FOR INSERT
WITH CHECK (
  (EXISTS (
    SELECT 1
    FROM client_assignments ca
    WHERE ca.client_id = client_documents.client_id 
      AND ca.employee_id = auth.uid() 
      AND ca.is_active = true
  )) 
  OR director_has_god_mode()
);

-- Criar política para atualizar documentos
CREATE POLICY "Staff can update documents of assigned clients"
ON client_documents
FOR UPDATE
USING (
  (EXISTS (
    SELECT 1
    FROM client_assignments ca
    WHERE ca.client_id = client_documents.client_id 
      AND ca.employee_id = auth.uid() 
      AND ca.is_active = true
  )) 
  OR director_has_god_mode()
)
WITH CHECK (
  (EXISTS (
    SELECT 1
    FROM client_assignments ca
    WHERE ca.client_id = client_documents.client_id 
      AND ca.employee_id = auth.uid() 
      AND ca.is_active = true
  )) 
  OR director_has_god_mode()
);

-- Criar política para deletar documentos
CREATE POLICY "Staff can delete documents of assigned clients"
ON client_documents
FOR DELETE
USING (
  (EXISTS (
    SELECT 1
    FROM client_assignments ca
    WHERE ca.client_id = client_documents.client_id 
      AND ca.employee_id = auth.uid() 
      AND ca.is_active = true
  )) 
  OR director_has_god_mode()
);