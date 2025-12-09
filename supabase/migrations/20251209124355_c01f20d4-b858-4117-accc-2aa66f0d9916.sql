-- Drop the incorrect policy
DROP POLICY IF EXISTS "Admins, Gestors and assignees can update department activities" ON public.department_activities;

-- Create the corrected policy
CREATE POLICY "Admins, Gestors and assignees can update department activities" 
ON public.department_activities 
FOR UPDATE 
USING (
  (EXISTS ( 
    SELECT 1
    FROM departments d
    WHERE d.id = department_activities.department_id 
    AND get_user_company_role(auth.uid(), d.company_id) = ANY (ARRAY['admin'::app_role, 'gestor'::app_role])
  )) 
  OR 
  (EXISTS ( 
    SELECT 1
    FROM department_activity_assignees daa
    WHERE daa.activity_id = department_activities.id 
    AND daa.user_id = auth.uid()
  ))
);