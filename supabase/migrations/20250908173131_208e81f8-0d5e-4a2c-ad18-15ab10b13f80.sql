-- Create enum for employee roles
CREATE TYPE public.employee_role AS ENUM (
  'director',
  'coordinator_madre', 
  'coordinator_floresta',
  'staff',
  'intern',
  'musictherapist',
  'financeiro',
  'receptionist',
  'psychologist',
  'psychopedagogue',
  'speech_therapist',
  'nutritionist',
  'physiotherapist'
);

-- Update profiles table to use the enum and add more fields
ALTER TABLE public.profiles 
DROP COLUMN role,
ADD COLUMN employee_role public.employee_role DEFAULT 'staff',
ADD COLUMN phone TEXT,
ADD COLUMN document_cpf TEXT,
ADD COLUMN document_rg TEXT,
ADD COLUMN birth_date DATE,
ADD COLUMN address TEXT,
ADD COLUMN is_active BOOLEAN DEFAULT true,
ADD COLUMN hire_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN department TEXT,
ADD COLUMN salary DECIMAL(10,2),
ADD COLUMN permissions JSONB DEFAULT '{}';

-- Create employees table for more detailed information
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_code TEXT UNIQUE,
  emergency_contact TEXT,
  emergency_phone TEXT,
  professional_license TEXT,
  specialization TEXT,
  work_schedule JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(profile_id)
);

-- Enable RLS on employees
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Create policies for employees
CREATE POLICY "Users can view their own employee record" 
ON public.employees 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Directors can view all employee records" 
ON public.employees 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = 'director'
  )
);

CREATE POLICY "Coordinators can view employee records" 
ON public.employees 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND employee_role IN ('director', 'coordinator_madre', 'coordinator_floresta')
  )
);

CREATE POLICY "Users can update their own employee record" 
ON public.employees 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Directors can update all employee records" 
ON public.employees 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = 'director'
  )
);

-- Create trigger for employees updated_at
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update the handle_new_user function to set employee_role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, employee_role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 'staff');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.employee_role AS $$
  SELECT employee_role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create function to check if user has permission
CREATE OR REPLACE FUNCTION public.user_has_role(required_roles public.employee_role[])
RETURNS BOOLEAN AS $$
  SELECT public.get_current_user_role() = ANY(required_roles);
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;