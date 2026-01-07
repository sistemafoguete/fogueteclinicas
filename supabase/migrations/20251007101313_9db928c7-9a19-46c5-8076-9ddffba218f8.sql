-- Primeiro, remover duplicatas mantendo apenas o registro mais recente
DELETE FROM public.user_specific_permissions a
USING public.user_specific_permissions b
WHERE a.id < b.id
AND a.user_id = b.user_id
AND a.permission = b.permission;

-- Adicionar constraint UNIQUE para evitar duplicatas no futuro
ALTER TABLE public.user_specific_permissions
ADD CONSTRAINT user_specific_permissions_user_permission_unique 
UNIQUE (user_id, permission);

-- Adicionar coluna updated_at se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_specific_permissions' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.user_specific_permissions 
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;