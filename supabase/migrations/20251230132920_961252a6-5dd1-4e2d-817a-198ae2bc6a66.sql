-- Corrigir RLS policies do checklist para permitir que colaboradores também criem itens
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins and Gestors can manage checklist" ON department_activity_checklist;
DROP POLICY IF EXISTS "Admins and Gestors can manage project activity checklist" ON project_activity_checklist;

-- Create new INSERT policies that allow any company member to add checklist items
CREATE POLICY "Company members can create checklist items"
ON department_activity_checklist
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM department_activities da
    JOIN departments d ON d.id = da.department_id
    WHERE da.id = department_activity_checklist.activity_id
    AND user_belongs_to_company(auth.uid(), d.company_id)
  )
);

CREATE POLICY "Company members can create project checklist items"
ON project_activity_checklist
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_activities pa
    JOIN projects p ON p.id = pa.project_id
    WHERE pa.id = project_activity_checklist.activity_id
    AND user_belongs_to_company(auth.uid(), p.company_id)
  )
);