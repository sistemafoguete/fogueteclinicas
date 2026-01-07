-- Criar foreign key entre schedules.employee_id e profiles.user_id
ALTER TABLE public.schedules 
ADD CONSTRAINT schedules_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES public.profiles(user_id);

-- Criar foreign key entre schedules.client_id e clients.id se não existir
ALTER TABLE public.schedules 
ADD CONSTRAINT schedules_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id);

-- Comentário explicativo
COMMENT ON CONSTRAINT schedules_employee_id_fkey ON public.schedules IS 
'Foreign key relacionando agendamentos com profissionais via profiles.user_id';