
-- Atualizar política para permitir que todos os membros da empresa criem atividades
-- (admins, gestores e colaboradores que pertençam à empresa)
DROP POLICY IF EXISTS "Admins and Gestors can create department activities" ON department_activities;

CREATE POLICY "Company members can create department activities" 
ON department_activities 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM departments d
    WHERE d.id = department_activities.department_id 
    AND user_belongs_to_company(auth.uid(), d.company_id)
  )
);

-- Também atualizar a política de update para permitir colaboradores atualizarem suas próprias atividades
DROP POLICY IF EXISTS "dept_activities_update" ON department_activities;

CREATE POLICY "Company members can update department activities" 
ON department_activities 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM departments d
    WHERE d.id = department_activities.department_id 
    AND (
      -- Admins e Gestores podem atualizar qualquer atividade
      get_user_company_role(auth.uid(), d.company_id) = ANY (ARRAY['admin'::app_role, 'gestor'::app_role])
      -- Ou o usuário é o criador da atividade
      OR department_activities.created_by = auth.uid()
      -- Ou o usuário é um responsável pela atividade
      OR EXISTS (
        SELECT 1 FROM department_activity_assignees daa
        WHERE daa.activity_id = department_activities.id
        AND daa.user_id = auth.uid()
      )
    )
  )
);
