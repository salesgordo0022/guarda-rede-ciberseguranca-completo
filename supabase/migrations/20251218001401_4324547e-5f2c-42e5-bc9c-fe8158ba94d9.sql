-- Drop the insecure view
DROP VIEW IF EXISTS public.project_indicators;

-- Create a secure function to get project indicators filtered by user's company
CREATE OR REPLACE FUNCTION public.get_project_indicators_for_user()
RETURNS TABLE (
  project_id uuid,
  project_name text,
  company_id uuid,
  total_activities bigint,
  completed_count bigint,
  on_time_count bigint,
  late_count bigint,
  completed_on_time_count bigint,
  completed_late_count bigint,
  beat_goal_count bigint,
  progress numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id as project_id,
    p.name as project_name,
    p.company_id,
    COUNT(pa.id) as total_activities,
    COUNT(CASE WHEN pa.status = 'concluida' THEN 1 END) as completed_count,
    COUNT(CASE WHEN pa.deadline_status = 'no_prazo' THEN 1 END) as on_time_count,
    COUNT(CASE WHEN pa.deadline_status = 'fora_do_prazo' THEN 1 END) as late_count,
    COUNT(CASE WHEN pa.deadline_status = 'concluido_no_prazo' THEN 1 END) as completed_on_time_count,
    COUNT(CASE WHEN pa.deadline_status = 'concluido_atrasado' THEN 1 END) as completed_late_count,
    COUNT(CASE WHEN pa.deadline_status = 'bateu_meta' THEN 1 END) as beat_goal_count,
    CASE 
      WHEN COUNT(pa.id) > 0 THEN 
        ROUND((COUNT(CASE WHEN pa.status = 'concluida' THEN 1 END)::numeric / COUNT(pa.id)::numeric) * 100, 2)
      ELSE 0
    END as progress
  FROM public.projects p
  LEFT JOIN public.project_activities pa ON pa.project_id = p.id
  WHERE public.user_belongs_to_company(auth.uid(), p.company_id)
  GROUP BY p.id, p.name, p.company_id
$$;