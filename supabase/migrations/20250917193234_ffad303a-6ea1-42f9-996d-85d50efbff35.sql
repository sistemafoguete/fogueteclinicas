-- Fix user session constraint issue by making it handle duplicates properly
-- Drop the problematic unique constraint and recreate with proper handling
DROP INDEX IF EXISTS idx_user_sessions_user_id;

-- Create a partial unique index that allows only one active session per user
CREATE UNIQUE INDEX idx_user_sessions_user_id ON public.user_sessions (user_id) WHERE is_active = true;

-- Recreate the trigger for automatic profile creation when users sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, employee_role, phone, department)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'employee_role')::public.employee_role, 'staff'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'department'
  );
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clean up old inactive sessions to prevent future conflicts
UPDATE public.user_sessions SET is_active = false WHERE is_active = true;

-- Create function to properly handle user session management
CREATE OR REPLACE FUNCTION public.update_user_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deactivate all existing sessions for this user first
  UPDATE public.user_sessions 
  SET is_active = false 
  WHERE user_id = auth.uid() AND is_active = true;
  
  -- Insert or update current session
  INSERT INTO public.user_sessions (user_id, session_token, is_active, last_activity)
  VALUES (auth.uid(), 'active', true, now())
  ON CONFLICT (user_id) WHERE is_active = true
  DO UPDATE SET 
    last_activity = now(),
    session_token = 'active';
    
  RETURN NULL;
END;
$$;