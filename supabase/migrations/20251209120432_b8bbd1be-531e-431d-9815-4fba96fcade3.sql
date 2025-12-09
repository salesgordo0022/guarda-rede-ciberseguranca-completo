
-- Cria função específica para department_activities (sem kanban_column)
CREATE OR REPLACE FUNCTION public.calculate_department_deadline_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Se não tem deadline, mantém 'no_prazo'
  IF NEW.deadline IS NULL THEN
    NEW.deadline_status = 'no_prazo';
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
    -- Concluída no prazo
    ELSIF NEW.completed_at::date = NEW.deadline THEN
      NEW.deadline_status = 'concluido_no_prazo';
    -- Concluída atrasada
    ELSE
      NEW.deadline_status = 'concluido_atrasado';
    END IF;
  -- Se não foi concluída
  ELSE
    NEW.completed_at = NULL;
    -- No prazo
    IF CURRENT_DATE <= NEW.deadline THEN
      NEW.deadline_status = 'no_prazo';
    -- Fora do prazo
    ELSE
      NEW.deadline_status = 'fora_do_prazo';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Remove trigger antigo
DROP TRIGGER IF EXISTS calculate_department_activity_deadline ON public.department_activities;

-- Cria trigger com a nova função
CREATE TRIGGER calculate_department_activity_deadline
  BEFORE INSERT OR UPDATE ON public.department_activities
  FOR EACH ROW EXECUTE FUNCTION public.calculate_department_deadline_status();
