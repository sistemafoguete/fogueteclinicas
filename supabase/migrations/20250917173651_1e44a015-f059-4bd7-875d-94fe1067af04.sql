-- Primeiro, corrigir os IDs inconsistentes mapeando para user_id correto
-- O problema é que alguns schedules têm profile.id ao invés de profile.user_id

-- Atualizar schedules que têm profile.id para usar profile.user_id
UPDATE public.schedules 
SET employee_id = p.user_id
FROM public.profiles p
WHERE schedules.employee_id = p.id;

-- Limpar qualquer employee_id que ainda não tenha correspondência em profiles.user_id
UPDATE public.schedules 
SET employee_id = NULL 
WHERE employee_id IS NOT NULL 
AND employee_id NOT IN (
  SELECT user_id FROM public.profiles WHERE user_id IS NOT NULL
);

-- Agora criar a foreign key que faltava
ALTER TABLE public.schedules 
ADD CONSTRAINT schedules_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES public.profiles(user_id);