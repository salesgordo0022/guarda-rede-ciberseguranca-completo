-- Primeiro, vamos remover a política antiga de INSERT e criar uma nova mais robusta
DROP POLICY IF EXISTS "Admins can create projects" ON public.projects;

-- Criar política de INSERT que também permite gestores criarem projetos
CREATE POLICY "Admins and Gestors can create projects" 
ON public.projects 
FOR INSERT 
TO authenticated
WITH CHECK (
  get_user_company_role(auth.uid(), company_id) IN ('admin', 'gestor')
  AND created_by = auth.uid()  -- Garante que created_by é o usuário atual
);

-- Atualizar a política de SELECT para ser mais robusta
DROP POLICY IF EXISTS "Project members and admins can view projects" ON public.projects;

CREATE POLICY "Project members and admins can view projects" 
ON public.projects 
FOR SELECT 
TO authenticated
USING (
  user_is_project_member_or_admin(auth.uid(), id)
  OR created_by = auth.uid()  -- Criador sempre pode ver
);