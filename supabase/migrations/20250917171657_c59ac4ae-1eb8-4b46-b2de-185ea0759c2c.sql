-- Fix attendance reports relationship and create automatic employee report population

-- First, let's add a trigger to automatically create employee reports from attendance reports
CREATE OR REPLACE FUNCTION public.create_employee_report_from_attendance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create employee report if attendance is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO public.employee_reports (
      employee_id,
      client_id,
      schedule_id,
      session_date,
      session_type,
      session_duration,
      materials_used,
      materials_cost,
      techniques_used,
      patient_response,
      professional_notes,
      session_objectives,
      next_session_plan,
      session_location,
      effort_rating,
      quality_rating,
      patient_cooperation,
      goal_achievement,
      created_at,
      updated_at
    ) VALUES (
      NEW.employee_id,
      NEW.client_id,
      NEW.schedule_id,
      NEW.start_time::date,
      NEW.attendance_type,
      NEW.session_duration,
      NEW.materials_used,
      COALESCE((NEW.materials_used->>'total_cost')::numeric, 0),
      NEW.techniques_used,
      NEW.patient_response,
      NEW.session_notes,
      NEW.observations,
      NEW.next_session_plan,
      'Unidade Dom Bosco',
      3,  -- Default effort rating
      3,  -- Default quality rating  
      3,  -- Default patient cooperation
      3,  -- Default goal achievement
      NOW(),
      NOW()
    )
    ON CONFLICT (employee_id, client_id, session_date, session_type) DO UPDATE SET
      session_duration = EXCLUDED.session_duration,
      materials_used = EXCLUDED.materials_used,
      materials_cost = EXCLUDED.materials_cost,
      techniques_used = EXCLUDED.techniques_used,
      patient_response = EXCLUDED.patient_response,
      professional_notes = EXCLUDED.professional_notes,
      session_objectives = EXCLUDED.session_objectives,
      next_session_plan = EXCLUDED.next_session_plan,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS attendance_to_employee_report_trigger ON public.attendance_reports;
CREATE TRIGGER attendance_to_employee_report_trigger
  AFTER INSERT OR UPDATE ON public.attendance_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.create_employee_report_from_attendance();

-- Add unique constraint to prevent duplicate employee reports
ALTER TABLE public.employee_reports 
DROP CONSTRAINT IF EXISTS unique_employee_report_session;

ALTER TABLE public.employee_reports 
ADD CONSTRAINT unique_employee_report_session 
UNIQUE (employee_id, client_id, session_date, session_type);

-- Create a helper function to get employee name from profiles
CREATE OR REPLACE FUNCTION public.get_employee_name(employee_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT name 
    FROM public.profiles 
    WHERE user_id = employee_uuid
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a helper function to get client name
CREATE OR REPLACE FUNCTION public.get_client_name(client_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT name 
    FROM public.clients 
    WHERE id = client_uuid
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;