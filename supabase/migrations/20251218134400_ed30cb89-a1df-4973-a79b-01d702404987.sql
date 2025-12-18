-- Reverter para a política original sem recursão
DROP POLICY IF EXISTS "Users can view projects of their companies" ON public.projects;

CREATE POLICY "Users can view projects of their companies"
ON public.projects
FOR SELECT
USING (user_belongs_to_company(auth.uid(), company_id));