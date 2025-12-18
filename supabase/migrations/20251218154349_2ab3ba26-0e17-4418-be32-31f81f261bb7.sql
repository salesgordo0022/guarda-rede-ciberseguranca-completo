-- Fix infinite recursion in RLS policy for project_members by avoiding self-referential subqueries
-- The previous SELECT policy referenced project_members inside its USING clause, causing recursion.

DROP POLICY IF EXISTS "Project members and admins can view project members" ON public.project_members;

CREATE POLICY "Project members and admins can view project members"
ON public.project_members
FOR SELECT
USING (
  public.user_is_project_member_or_admin(auth.uid(), project_id)
);
