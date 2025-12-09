-- First, drop ALL update policies on department_activities to clean up
DROP POLICY IF EXISTS "Admins, Gestors and assignees can update department activities" ON public.department_activities;
DROP POLICY IF EXISTS "department_activities_update_policy" ON public.department_activities;

-- Create a simple update policy that only checks admin/gestor role (no assignees check to avoid recursion)
CREATE POLICY "dept_activities_update" 
ON public.department_activities 
FOR UPDATE 
USING (
  EXISTS ( 
    SELECT 1
    FROM departments d
    WHERE d.id = department_activities.department_id 
    AND get_user_company_role(auth.uid(), d.company_id) = ANY (ARRAY['admin'::app_role, 'gestor'::app_role])
  )
);