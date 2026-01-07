-- Add status column to meeting_alerts table
ALTER TABLE public.meeting_alerts 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled';

-- Add check constraint for valid status values
ALTER TABLE public.meeting_alerts
DROP CONSTRAINT IF EXISTS meeting_alerts_status_check;

ALTER TABLE public.meeting_alerts
ADD CONSTRAINT meeting_alerts_status_check 
CHECK (status IN ('scheduled', 'completed', 'cancelled'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_meeting_alerts_status ON public.meeting_alerts(status);
CREATE INDEX IF NOT EXISTS idx_meeting_alerts_meeting_date ON public.meeting_alerts(meeting_date);