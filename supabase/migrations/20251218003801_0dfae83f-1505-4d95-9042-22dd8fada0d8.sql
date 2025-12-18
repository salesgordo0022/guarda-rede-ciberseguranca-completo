
-- Adicionar coluna goal_date (meta) na tabela department_activities
ALTER TABLE public.department_activities 
ADD COLUMN IF NOT EXISTS goal_date date;

-- Adicionar coluna goal_date na tabela project_activities também
ALTER TABLE public.project_activities 
ADD COLUMN IF NOT EXISTS goal_date date;
