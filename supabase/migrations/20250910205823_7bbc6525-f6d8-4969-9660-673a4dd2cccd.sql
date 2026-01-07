-- Verificar se o item de menu para backup já existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.menu_items WHERE url = '/backup-messages'
  ) THEN
    INSERT INTO public.menu_items (title, url, icon, order_index, role_required, is_active) 
    VALUES (
      'Backup Mensagens',
      '/backup-messages', 
      'Archive',
      100, 
      'director',
      true
    );
  END IF;
END $$;