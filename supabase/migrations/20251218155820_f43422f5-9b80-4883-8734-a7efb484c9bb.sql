-- Corrigir RLS para project_members - Admin E Gestor podem gerenciar membros

-- DROP das policies existentes de INSERT e DELETE
DROP POLICY IF EXISTS "Admins can manage project members" ON public.project_members;
DROP POLICY IF EXISTS "Admins can delete project members" ON public.project_members;

-- Criar novas policies para Admin + Gestor gerenciar membros
CREATE POLICY "Admins and Gestors can manage project members"
ON public.project_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_members.project_id
    AND get_user_company_role(auth.uid(), p.company_id) IN ('admin', 'gestor')
  )
);

CREATE POLICY "Admins and Gestors can delete project members"
ON public.project_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_members.project_id
    AND get_user_company_role(auth.uid(), p.company_id) IN ('admin', 'gestor')
  )
);