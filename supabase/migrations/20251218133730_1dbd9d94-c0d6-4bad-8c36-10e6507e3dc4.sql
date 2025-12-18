-- Criar tabela de membros de projeto para controlar acesso
CREATE TABLE public.project_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(project_id, user_id)
);

-- Enable RLS
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Policies for project_members
CREATE POLICY "Users can view project members of their company"
ON public.project_members
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = project_members.project_id
        AND user_belongs_to_company(auth.uid(), p.company_id)
    )
);

CREATE POLICY "Admins can manage project members"
ON public.project_members
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = project_members.project_id
        AND get_user_company_role(auth.uid(), p.company_id) = 'admin'
    )
);

CREATE POLICY "Admins can delete project members"
ON public.project_members
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = project_members.project_id
        AND get_user_company_role(auth.uid(), p.company_id) = 'admin'
    )
);

-- Update projects RLS policy to respect project_members
DROP POLICY IF EXISTS "Users can view projects of their companies" ON public.projects;

CREATE POLICY "Users can view projects of their companies"
ON public.projects
FOR SELECT
USING (
    -- Admin vê todos os projetos da empresa
    get_user_company_role(auth.uid(), company_id) = 'admin'
    OR
    -- Criador do projeto sempre vê
    created_by = auth.uid()
    OR
    -- Membros do projeto podem ver
    EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = projects.id
        AND pm.user_id = auth.uid()
    )
);