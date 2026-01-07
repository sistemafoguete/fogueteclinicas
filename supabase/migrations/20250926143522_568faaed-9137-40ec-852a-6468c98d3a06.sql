-- Add patient_arrived column to schedules table to track patient presence
ALTER TABLE public.schedules 
ADD COLUMN patient_arrived BOOLEAN DEFAULT FALSE,
ADD COLUMN arrived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN arrived_confirmed_by UUID REFERENCES auth.users(id);