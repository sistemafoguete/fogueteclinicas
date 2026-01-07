-- Remover item de menu de backup de mensagens
DELETE FROM public.menu_items WHERE url = '/backup-messages';