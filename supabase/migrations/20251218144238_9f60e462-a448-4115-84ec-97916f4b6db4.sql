-- Drop existing SELECT policy on projects
DROP POLICY IF EXISTS "Users can view projects of their companies" ON public.projects;

-- Create a function to check if user is project member or admin
CREATE OR REPLACE FUNCTION public.user_is_project_member_or_admin(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project_id
    AND (
      -- User is admin of the company
      get_user_company_role(_user_id, p.company_id) = 'admin'
      -- OR user is a member of the project
      OR EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = _project_id
        AND pm.user_id = _user_id
      )
      -- OR user created the project
      OR p.created_by = _user_id
    )
  )
$$;

-- Create new SELECT policy: only members, admins, or creator can view
CREATE POLICY "Project members and admins can view projects"
ON public.projects
FOR SELECT
USING (
  user_is_project_member_or_admin(auth.uid(), id)
);

-- Update project_members SELECT policy to be more restrictive
DROP POLICY IF EXISTS "Users can view project members of their company" ON public.project_members;

CREATE POLICY "Project members and admins can view project members"
ON public.project_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_members.project_id
    AND (
      get_user_company_role(auth.uid(), p.company_id) = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.project_members pm2
        WHERE pm2.project_id = project_members.project_id
        AND pm2.user_id = auth.uid()
      )
      OR p.created_by = auth.uid()
    )
  )
);

-- Also update project_activities SELECT policy
DROP POLICY IF EXISTS "Users can view project activities" ON public.project_activities;

CREATE POLICY "Project members and admins can view project activities"
ON public.project_activities
FOR SELECT
USING (
  user_is_project_member_or_admin(auth.uid(), project_id)
);