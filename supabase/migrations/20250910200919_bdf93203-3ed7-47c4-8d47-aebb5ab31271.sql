-- Add foreign key constraints to improve relationships
ALTER TABLE public.internal_messages 
ADD CONSTRAINT internal_messages_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES public.profiles(user_id);

ALTER TABLE public.internal_messages 
ADD CONSTRAINT internal_messages_recipient_id_fkey 
FOREIGN KEY (recipient_id) REFERENCES public.profiles(user_id);

ALTER TABLE public.user_presence 
ADD CONSTRAINT user_presence_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);