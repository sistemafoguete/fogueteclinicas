-- Primeiro corrigir os dados inconsistentes
UPDATE public.schedules 
SET employee_id = NULL 
WHERE employee_id IS NOT NULL 
AND employee_id NOT IN (
  SELECT user_id FROM public.profiles WHERE user_id IS NOT NULL
);

-- Criar apenas a foreign key que falta
ALTER TABLE public.schedules 
ADD CONSTRAINT schedules_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES public.profiles(user_id);