-- Adicionar permissão específica para o usuário ver financeiro
INSERT INTO user_specific_permissions (
  user_id,
  permission,
  granted,
  reason,
  granted_by
) VALUES (
  'e99472e0-91c6-4982-8efb-e9eb4dcb1c26',
  'view_financial',
  true,
  'Permissão para visualizar financeiro da unidade Floresta',
  auth.uid()
)
ON CONFLICT (user_id, permission) 
DO UPDATE SET 
  granted = true,
  reason = 'Permissão para visualizar financeiro da unidade Floresta',
  updated_at = now();

-- Atualizar política RLS para permitir coordenadores com permissão específica
DROP POLICY IF EXISTS "Financial access policy" ON financial_records;

CREATE POLICY "Financial access policy"
ON financial_records
FOR ALL
TO authenticated
USING (
  -- Diretores têm acesso total
  user_has_role(ARRAY['director'::employee_role])
  OR
  -- Usuários com permissão específica view_financial
  user_has_permission(auth.uid(), 'view_financial'::permission_action)
  OR
  -- Financeiro tem acesso total
  user_has_role(ARRAY['financeiro'::employee_role])
)
WITH CHECK (
  -- Apenas diretores e financeiro podem criar/editar
  user_has_role(ARRAY['director'::employee_role, 'financeiro'::employee_role])
  OR
  -- Usuários com permissões específicas de criar/editar financeiro
  (user_has_permission(auth.uid(), 'create_financial_records'::permission_action) OR
   user_has_permission(auth.uid(), 'edit_financial_records'::permission_action))
);