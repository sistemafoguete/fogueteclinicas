-- Complete fix for user sessions table to prevent duplicates completely
-- First, clean up any existing conflicting records
DELETE FROM public.user_sessions WHERE NOT is_active;

-- Drop the problematic index entirely
DROP INDEX IF EXISTS idx_user_sessions_user_id;

-- Create a function to handle session management properly
CREATE OR REPLACE FUNCTION public.manage_user_session(p_user_id uuid, p_session_token text, p_user_agent text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First deactivate all existing sessions for this user
  UPDATE public.user_sessions 
  SET is_active = false 
  WHERE user_id = p_user_id;
  
  -- Then insert the new session
  INSERT INTO public.user_sessions (
    user_id, 
    session_token, 
    is_active, 
    last_activity, 
    user_agent
  ) VALUES (
    p_user_id, 
    p_session_token, 
    true, 
    NOW(), 
    p_user_agent
  );
END;
$$;

-- Create a simpler unique index that allows multiple inactive sessions but only one active
CREATE UNIQUE INDEX idx_user_sessions_user_active 
ON public.user_sessions (user_id) 
WHERE is_active = true;