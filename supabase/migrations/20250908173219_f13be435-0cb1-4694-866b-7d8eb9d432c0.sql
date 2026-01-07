-- Insert sample employees for testing
-- Note: These will be created as auth users when someone signs up with these emails

-- Create sample employee profiles (these will be created when users sign up)
-- For now, let's create a function to easily create test employees

CREATE OR REPLACE FUNCTION public.create_test_employee(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT,
  p_role public.employee_role,
  p_phone TEXT DEFAULT NULL,
  p_department TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  user_id UUID;
  profile_id UUID;
BEGIN
  -- This function is for development/testing only
  -- In production, users will be created through the signup process
  
  -- For now, just return a message indicating the employee data structure is ready
  RETURN 'Employee structure ready for: ' || p_name || ' (' || p_role::TEXT || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update profiles RLS policies to work with the new employee_role column
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Directors can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = 'director'
  )
);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Directors can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND employee_role = 'director'
  )
);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create a view for employee management
CREATE OR REPLACE VIEW public.employee_details AS
SELECT 
  p.id as profile_id,
  p.user_id,
  p.name,
  p.employee_role,
  p.phone,
  p.document_cpf,
  p.document_rg,
  p.birth_date,
  p.address,
  p.is_active,
  p.hire_date,
  p.department,
  p.salary,
  p.permissions,
  e.employee_code,
  e.emergency_contact,
  e.emergency_phone,
  e.professional_license,
  e.specialization,
  e.work_schedule,
  e.notes as employee_notes,
  p.created_at,
  p.updated_at
FROM public.profiles p
LEFT JOIN public.employees e ON p.id = e.profile_id
WHERE p.employee_role IS NOT NULL;

-- Create RLS policy for the view
ALTER VIEW public.employee_details SET (security_barrier = true);

-- Create function to initialize employee record after profile creation
CREATE OR REPLACE FUNCTION public.initialize_employee_record()
RETURNS TRIGGER AS $$
BEGIN
  -- Create employee record if it doesn't exist
  INSERT INTO public.employees (user_id, profile_id, employee_code)
  VALUES (
    NEW.user_id, 
    NEW.id, 
    'EMP' || LPAD(EXTRACT(YEAR FROM NOW())::TEXT, 4, '0') || LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0') || LPAD(NEW.id::TEXT, 8, '0')
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-create employee record
CREATE TRIGGER create_employee_record_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_employee_record();