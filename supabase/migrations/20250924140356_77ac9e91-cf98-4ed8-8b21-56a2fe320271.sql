-- First add updated_at field to fix the trigger issue
ALTER TABLE public.stock_movements 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Now add the other missing columns
ALTER TABLE public.stock_movements 
ADD COLUMN IF NOT EXISTS moved_by UUID,
ADD COLUMN IF NOT EXISTS previous_quantity INTEGER,
ADD COLUMN IF NOT EXISTS new_quantity INTEGER, 
ADD COLUMN IF NOT EXISTS attendance_id UUID,
ADD COLUMN IF NOT EXISTS from_location TEXT,
ADD COLUMN IF NOT EXISTS to_location TEXT;

-- Update moved_by to use created_by data where null
UPDATE public.stock_movements 
SET moved_by = created_by 
WHERE moved_by IS NULL AND created_by IS NOT NULL;