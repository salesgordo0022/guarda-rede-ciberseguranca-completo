
-- Adicionar coluna priority na tabela department_activities
ALTER TABLE public.department_activities 
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'media' CHECK (priority IN ('urgente', 'nao_urgente', 'media'));

-- Tabela de comentários das atividades
CREATE TABLE public.department_activity_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id uuid NOT NULL REFERENCES public.department_activities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de checklist das atividades
CREATE TABLE public.department_activity_checklist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id uuid NOT NULL REFERENCES public.department_activities(id) ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean DEFAULT false,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de histórico de atualizações das atividades
CREATE TABLE public.department_activity_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id uuid NOT NULL REFERENCES public.department_activities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  old_value text,
  new_value text,
  field_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de diário de bordo das atividades
CREATE TABLE public.department_activity_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id uuid NOT NULL REFERENCES public.department_activities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.department_activity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_activity_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_activity_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_activity_notes ENABLE ROW LEVEL SECURITY;

-- Policies para comentários
CREATE POLICY "Users can view activity comments" ON public.department_activity_comments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM department_activities da
    JOIN departments d ON d.id = da.department_id
    WHERE da.id = department_activity_comments.activity_id
    AND user_belongs_to_company(auth.uid(), d.company_id)
  )
);

CREATE POLICY "Users can create activity comments" ON public.department_activity_comments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM department_activities da
    JOIN departments d ON d.id = da.department_id
    WHERE da.id = department_activity_comments.activity_id
    AND user_belongs_to_company(auth.uid(), d.company_id)
  )
  AND user_id = auth.uid()
);

CREATE POLICY "Users can update own comments" ON public.department_activity_comments
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments" ON public.department_activity_comments
FOR DELETE USING (user_id = auth.uid());

-- Policies para checklist
CREATE POLICY "Users can view activity checklist" ON public.department_activity_checklist
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM department_activities da
    JOIN departments d ON d.id = da.department_id
    WHERE da.id = department_activity_checklist.activity_id
    AND user_belongs_to_company(auth.uid(), d.company_id)
  )
);

CREATE POLICY "Admins and Gestors can manage checklist" ON public.department_activity_checklist
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM department_activities da
    JOIN departments d ON d.id = da.department_id
    WHERE da.id = department_activity_checklist.activity_id
    AND get_user_company_role(auth.uid(), d.company_id) = ANY (ARRAY['admin'::app_role, 'gestor'::app_role])
  )
);

CREATE POLICY "Admins and Gestors can update checklist" ON public.department_activity_checklist
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM department_activities da
    JOIN departments d ON d.id = da.department_id
    WHERE da.id = department_activity_checklist.activity_id
    AND user_belongs_to_company(auth.uid(), d.company_id)
  )
);

CREATE POLICY "Admins and Gestors can delete checklist" ON public.department_activity_checklist
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM department_activities da
    JOIN departments d ON d.id = da.department_id
    WHERE da.id = department_activity_checklist.activity_id
    AND get_user_company_role(auth.uid(), d.company_id) = ANY (ARRAY['admin'::app_role, 'gestor'::app_role])
  )
);

-- Policies para histórico
CREATE POLICY "Users can view activity history" ON public.department_activity_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM department_activities da
    JOIN departments d ON d.id = da.department_id
    WHERE da.id = department_activity_history.activity_id
    AND user_belongs_to_company(auth.uid(), d.company_id)
  )
);

CREATE POLICY "Users can create history entries" ON public.department_activity_history
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM department_activities da
    JOIN departments d ON d.id = da.department_id
    WHERE da.id = department_activity_history.activity_id
    AND user_belongs_to_company(auth.uid(), d.company_id)
  )
  AND user_id = auth.uid()
);

-- Policies para diário de bordo
CREATE POLICY "Users can view activity notes" ON public.department_activity_notes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM department_activities da
    JOIN departments d ON d.id = da.department_id
    WHERE da.id = department_activity_notes.activity_id
    AND user_belongs_to_company(auth.uid(), d.company_id)
  )
);

CREATE POLICY "Users can create activity notes" ON public.department_activity_notes
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM department_activities da
    JOIN departments d ON d.id = da.department_id
    WHERE da.id = department_activity_notes.activity_id
    AND user_belongs_to_company(auth.uid(), d.company_id)
  )
  AND user_id = auth.uid()
);

CREATE POLICY "Users can update own notes" ON public.department_activity_notes
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notes" ON public.department_activity_notes
FOR DELETE USING (user_id = auth.uid());
