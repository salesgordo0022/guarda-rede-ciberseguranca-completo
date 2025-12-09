-- Drop the incorrect policy for project_activities
DROP POLICY IF EXISTS "Admins, Gestors and assignees can update project activities" ON public.project_activities;

-- Create the corrected policy for project_activities
CREATE POLICY "Admins, Gestors and assignees can update project activities" 
ON public.project_activities 
FOR UPDATE 
USING (
  (EXISTS ( 
    SELECT 1
    FROM projects p
    WHERE p.id = project_activities.project_id 
    AND get_user_company_role(auth.uid(), p.company_id) = ANY (ARRAY['admin'::app_role, 'gestor'::app_role])
  )) 
  OR 
  (EXISTS ( 
    SELECT 1
    FROM project_activity_assignees paa
    WHERE paa.activity_id = project_activities.id 
    AND paa.user_id = auth.uid()
  ))
);