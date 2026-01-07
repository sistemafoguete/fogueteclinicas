-- Update menu items with new comprehensive clinical management tabs
INSERT INTO public.menu_items (title, url, icon, order_index, role_required, is_active) VALUES
  ('Controle de Ponto', '/timesheet', 'Clock', 90, NULL, true),
  ('Prontuários', '/medical-records', 'FileHeart', 95, NULL, true),
  ('Qualidade', '/quality-control', 'Award', 100, 'director', true),
  ('Mensagens', '/messages', 'MessageCircle', 105, NULL, true),
  ('Configurações', '/settings', 'Settings', 110, 'director', true),
  ('Auditoria', '/audit', 'Shield', 115, 'director', true)
ON CONFLICT (url) DO UPDATE SET
  title = EXCLUDED.title,
  icon = EXCLUDED.icon,
  order_index = EXCLUDED.order_index,
  is_active = EXCLUDED.is_active;