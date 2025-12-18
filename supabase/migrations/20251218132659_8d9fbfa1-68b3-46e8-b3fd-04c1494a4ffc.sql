-- Add priority column to project_activities
ALTER TABLE public.project_activities 
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'media';

-- Create project_activity_checklist table
CREATE TABLE IF NOT EXISTS public.project_activity_checklist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id uuid NOT NULL REFERENCES public.project_activities(id) ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean DEFAULT false,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create project_activity_comments table
CREATE TABLE IF NOT EXISTS public.project_activity_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id uuid NOT NULL REFERENCES public.project_activities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create project_activity_history table
CREATE TABLE IF NOT EXISTS public.project_activity_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id uuid NOT NULL REFERENCES public.project_activities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  field_name text,
  old_value text,
  new_value text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create project_activity_notes table
CREATE TABLE IF NOT EXISTS public.project_activity_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id uuid NOT NULL REFERENCES public.project_activities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.project_activity_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_activity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_activity_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_activity_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_activity_checklist
CREATE POLICY "Users can view project activity checklist"
ON public.project_activity_checklist FOR SELECT
USING (EXISTS (
  SELECT 1 FROM project_activities pa
  JOIN projects p ON p.id = pa.project_id
  WHERE pa.id = project_activity_checklist.activity_id
  AND user_belongs_to_company(auth.uid(), p.company_id)
));

CREATE POLICY "Admins and Gestors can manage project activity checklist"
ON public.project_activity_checklist FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM project_activities pa
  JOIN projects p ON p.id = pa.project_id
  WHERE pa.id = project_activity_checklist.activity_id
  AND get_user_company_role(auth.uid(), p.company_id) IN ('admin', 'gestor')
));

CREATE POLICY "Admins and Gestors can update project activity checklist"
ON public.project_activity_checklist FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM project_activities pa
  JOIN projects p ON p.id = pa.project_id
  WHERE pa.id = project_activity_checklist.activity_id
  AND user_belongs_to_company(auth.uid(), p.company_id)
));

CREATE POLICY "Admins and Gestors can delete project activity checklist"
ON public.project_activity_checklist FOR DELETE
USING (EXISTS (
  SELECT 1 FROM project_activities pa
  JOIN projects p ON p.id = pa.project_id
  WHERE pa.id = project_activity_checklist.activity_id
  AND get_user_company_role(auth.uid(), p.company_id) IN ('admin', 'gestor')
));

-- RLS Policies for project_activity_comments
CREATE POLICY "Users can view project activity comments"
ON public.project_activity_comments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM project_activities pa
  JOIN projects p ON p.id = pa.project_id
  WHERE pa.id = project_activity_comments.activity_id
  AND user_belongs_to_company(auth.uid(), p.company_id)
));

CREATE POLICY "Users can create project activity comments"
ON public.project_activity_comments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_activities pa
    JOIN projects p ON p.id = pa.project_id
    WHERE pa.id = project_activity_comments.activity_id
    AND user_belongs_to_company(auth.uid(), p.company_id)
  ) AND user_id = auth.uid()
);

CREATE POLICY "Users can update own project comments"
ON public.project_activity_comments FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own project comments"
ON public.project_activity_comments FOR DELETE
USING (user_id = auth.uid());

-- RLS Policies for project_activity_history
CREATE POLICY "Users can view project activity history"
ON public.project_activity_history FOR SELECT
USING (EXISTS (
  SELECT 1 FROM project_activities pa
  JOIN projects p ON p.id = pa.project_id
  WHERE pa.id = project_activity_history.activity_id
  AND user_belongs_to_company(auth.uid(), p.company_id)
));

CREATE POLICY "Users can create project activity history"
ON public.project_activity_history FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_activities pa
    JOIN projects p ON p.id = pa.project_id
    WHERE pa.id = project_activity_history.activity_id
    AND user_belongs_to_company(auth.uid(), p.company_id)
  ) AND user_id = auth.uid()
);

-- RLS Policies for project_activity_notes
CREATE POLICY "Users can view project activity notes"
ON public.project_activity_notes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM project_activities pa
  JOIN projects p ON p.id = pa.project_id
  WHERE pa.id = project_activity_notes.activity_id
  AND user_belongs_to_company(auth.uid(), p.company_id)
));

CREATE POLICY "Users can create project activity notes"
ON public.project_activity_notes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_activities pa
    JOIN projects p ON p.id = pa.project_id
    WHERE pa.id = project_activity_notes.activity_id
    AND user_belongs_to_company(auth.uid(), p.company_id)
  ) AND user_id = auth.uid()
);

CREATE POLICY "Users can update own project notes"
ON public.project_activity_notes FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own project notes"
ON public.project_activity_notes FOR DELETE
USING (user_id = auth.uid());