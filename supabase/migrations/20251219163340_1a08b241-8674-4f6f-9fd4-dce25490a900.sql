-- Create a security definer function to check if user can update department activity
CREATE OR REPLACE FUNCTION public.user_can_update_department_activity(_user_id uuid, _activity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM department_activities da
    JOIN departments d ON d.id = da.department_id
    WHERE da.id = _activity_id
    AND (
      -- User is admin or gestor of the company
      get_user_company_role(_user_id, d.company_id) IN ('admin', 'gestor')
      -- OR user created the activity
      OR da.created_by = _user_id
      -- OR user is assigned to the activity
      OR EXISTS (
        SELECT 1 FROM department_activity_assignees daa
        WHERE daa.activity_id = da.id AND daa.user_id = _user_id
      )
    )
  )
$$;

-- Drop the old UPDATE policy
DROP POLICY IF EXISTS "Company members can update department activities" ON public.department_activities;

-- Create new UPDATE policy using the security definer function
CREATE POLICY "Company members can update department activities" 
ON public.department_activities 
FOR UPDATE 
USING (user_can_update_department_activity(auth.uid(), id));