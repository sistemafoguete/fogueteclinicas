-- Adicionar item de menu para backup de mensagens
INSERT INTO public.menu_items (title, url, icon, order_index, role_required, is_active) 
VALUES (
  'Backup Mensagens',
  '/backup-messages', 
  'Archive',
  100, 
  'director',
  true
) ON CONFLICT (url) DO UPDATE SET
  title = EXCLUDED.title,
  icon = EXCLUDED.icon,
  order_index = EXCLUDED.order_index,
  role_required = EXCLUDED.role_required,
  is_active = EXCLUDED.is_active;