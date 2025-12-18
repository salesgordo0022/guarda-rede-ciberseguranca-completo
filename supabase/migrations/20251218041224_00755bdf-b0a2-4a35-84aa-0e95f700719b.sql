-- Fix function search_path (security linter)

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_deadline_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Se não tem deadline, mantém 'no_prazo'
  IF NEW.deadline IS NULL THEN
    NEW.deadline_status = 'no_prazo';
    NEW.kanban_column = 'no_prazo';
    RETURN NEW;
  END IF;
  
  -- Se foi concluída
  IF NEW.status = 'concluida' THEN
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at = now();
    END IF;
    
    -- Bateu a meta (concluída antes do prazo)
    IF NEW.completed_at::date < NEW.deadline THEN
      NEW.deadline_status = 'bateu_meta';
      NEW.kanban_column = 'bateu_meta';
    -- Concluída no prazo
    ELSIF NEW.completed_at::date = NEW.deadline THEN
      NEW.deadline_status = 'concluido_no_prazo';
      NEW.kanban_column = 'concluidas';
    -- Concluída atrasada
    ELSE
      NEW.deadline_status = 'concluido_atrasado';
      NEW.kanban_column = 'concluidas';
    END IF;
  -- Se não foi concluída
  ELSE
    NEW.completed_at = NULL;
    -- No prazo
    IF CURRENT_DATE <= NEW.deadline THEN
      NEW.deadline_status = 'no_prazo';
      NEW.kanban_column = 'no_prazo';
    -- Fora do prazo
    ELSE
      NEW.deadline_status = 'fora_do_prazo';
      NEW.kanban_column = 'fora_prazo';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_project_progress()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _total INTEGER;
  _completed INTEGER;
  _progress NUMERIC(5,2);
BEGIN
  -- Conta total de atividades do projeto
  SELECT COUNT(*) INTO _total
  FROM public.project_activities
  WHERE project_id = COALESCE(NEW.project_id, OLD.project_id);
  
  -- Conta atividades concluídas
  SELECT COUNT(*) INTO _completed
  FROM public.project_activities
  WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    AND status = 'concluida';
  
  -- Calcula progresso
  IF _total > 0 THEN
    _progress = (_completed::NUMERIC / _total::NUMERIC) * 100;
  ELSE
    _progress = 0;
  END IF;
  
  -- Atualiza projeto
  UPDATE public.projects
  SET 
    total_activities = _total,
    completed_activities = _completed,
    progress = _progress,
    updated_at = now()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;