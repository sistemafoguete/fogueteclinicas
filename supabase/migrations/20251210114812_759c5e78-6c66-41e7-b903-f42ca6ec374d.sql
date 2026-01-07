-- Add column to track if user must change password on first login
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT true;

-- Set existing users to not require password change (they already have their passwords)
UPDATE public.profiles SET must_change_password = false WHERE must_change_password IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.must_change_password IS 'If true, user must change password on next login';