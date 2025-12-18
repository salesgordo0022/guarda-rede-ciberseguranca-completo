-- Update the check constraint to include 'yearly'
ALTER TABLE public.department_activities 
DROP CONSTRAINT IF EXISTS department_activities_recurrence_type_check;

ALTER TABLE public.department_activities 
ADD CONSTRAINT department_activities_recurrence_type_check 
CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'yearly'));

-- Add column for month (for yearly recurrence)
ALTER TABLE public.department_activities
ADD COLUMN IF NOT EXISTS recurrence_month INTEGER;