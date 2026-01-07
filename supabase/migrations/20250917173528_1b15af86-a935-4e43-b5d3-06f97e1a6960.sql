-- Corrigir dados inconsistentes - deletar schedules órfãos ou definir como NULL
UPDATE public.schedules 
SET employee_id = NULL 
WHERE employee_id IS NOT NULL 
AND employee_id NOT IN (
  SELECT user_id FROM public.profiles WHERE user_id IS NOT NULL
);

-- Agora criar as foreign keys
ALTER TABLE public.schedules 
ADD CONSTRAINT schedules_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES public.profiles(user_id);

ALTER TABLE public.schedules 
ADD CONSTRAINT schedules_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id);