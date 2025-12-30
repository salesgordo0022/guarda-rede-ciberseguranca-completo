
-- Trigger function para adicionar pontos quando department_activity é concluída
CREATE OR REPLACE FUNCTION public.handle_department_activity_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id uuid;
  _assignee_id uuid;
  _points integer;
  _is_beat_goal boolean;
BEGIN
  -- Só processa se a atividade acabou de ser concluída
  IF NEW.status = 'concluida' AND (OLD.status IS NULL OR OLD.status != 'concluida') THEN
    -- Obtém o company_id do departamento
    SELECT d.company_id INTO _company_id
    FROM departments d
    WHERE d.id = NEW.department_id;
    
    IF _company_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Determina os pontos baseado no deadline_status
    IF NEW.deadline_status = 'bateu_meta' THEN
      _points := 10;
      _is_beat_goal := true;
    ELSIF NEW.deadline_status = 'concluido_no_prazo' THEN
      _points := 5;
      _is_beat_goal := false;
    ELSE
      -- Não dá pontos se concluiu atrasado
      RETURN NEW;
    END IF;
    
    -- Adiciona pontos para cada assignee
    FOR _assignee_id IN 
      SELECT user_id FROM department_activity_assignees WHERE activity_id = NEW.id
    LOOP
      PERFORM add_user_score(_assignee_id, _company_id, _points, _is_beat_goal);
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function para adicionar pontos quando project_activity é concluída
CREATE OR REPLACE FUNCTION public.handle_project_activity_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id uuid;
  _assignee_id uuid;
  _points integer;
  _is_beat_goal boolean;
BEGIN
  -- Só processa se a atividade acabou de ser concluída
  IF NEW.status = 'concluida' AND (OLD.status IS NULL OR OLD.status != 'concluida') THEN
    -- Obtém o company_id do projeto
    SELECT p.company_id INTO _company_id
    FROM projects p
    WHERE p.id = NEW.project_id;
    
    IF _company_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Determina os pontos baseado no deadline_status
    IF NEW.deadline_status = 'bateu_meta' THEN
      _points := 10;
      _is_beat_goal := true;
    ELSIF NEW.deadline_status = 'concluido_no_prazo' THEN
      _points := 5;
      _is_beat_goal := false;
    ELSE
      -- Não dá pontos se concluiu atrasado
      RETURN NEW;
    END IF;
    
    -- Adiciona pontos para cada assignee
    FOR _assignee_id IN 
      SELECT user_id FROM project_activity_assignees WHERE activity_id = NEW.id
    LOOP
      PERFORM add_user_score(_assignee_id, _company_id, _points, _is_beat_goal);
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar os triggers
DROP TRIGGER IF EXISTS on_department_activity_completed ON department_activities;
CREATE TRIGGER on_department_activity_completed
  AFTER UPDATE ON department_activities
  FOR EACH ROW
  EXECUTE FUNCTION handle_department_activity_score();

DROP TRIGGER IF EXISTS on_project_activity_completed ON project_activities;
CREATE TRIGGER on_project_activity_completed
  AFTER UPDATE ON project_activities
  FOR EACH ROW
  EXECUTE FUNCTION handle_project_activity_score();

-- Também criar trigger para INSERT (caso atividade já seja criada como concluída)
DROP TRIGGER IF EXISTS on_department_activity_created_completed ON department_activities;
CREATE TRIGGER on_department_activity_created_completed
  AFTER INSERT ON department_activities
  FOR EACH ROW
  WHEN (NEW.status = 'concluida')
  EXECUTE FUNCTION handle_department_activity_score();

DROP TRIGGER IF EXISTS on_project_activity_created_completed ON project_activities;
CREATE TRIGGER on_project_activity_created_completed
  AFTER INSERT ON project_activities
  FOR EACH ROW
  WHEN (NEW.status = 'concluida')
  EXECUTE FUNCTION handle_project_activity_score();

-- Atualizar a função add_user_score para usar UPSERT corretamente
CREATE OR REPLACE FUNCTION public.add_user_score(_user_id uuid, _company_id uuid, _points integer, _is_beat_goal boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_score INTEGER;
  _new_score INTEGER;
  _cycles INTEGER;
BEGIN
  -- Inserir registro se não existir
  INSERT INTO public.user_scores (user_id, company_id, current_score, beat_goal_count, on_time_count)
  VALUES (_user_id, _company_id, 0, 0, 0)
  ON CONFLICT (user_id, company_id) DO NOTHING;
  
  -- Obter score atual
  SELECT current_score INTO _current_score
  FROM public.user_scores
  WHERE user_id = _user_id AND company_id = _company_id;
  
  _new_score := COALESCE(_current_score, 0) + _points;
  _cycles := 0;
  
  -- Verificar se completou 100 pontos
  WHILE _new_score >= 100 LOOP
    _new_score := _new_score - 100;
    _cycles := _cycles + 1;
  END LOOP;
  
  -- Atualizar score
  UPDATE public.user_scores
  SET 
    current_score = _new_score,
    total_cycles_completed = total_cycles_completed + _cycles,
    beat_goal_count = beat_goal_count + CASE WHEN _is_beat_goal THEN 1 ELSE 0 END,
    on_time_count = on_time_count + CASE WHEN NOT _is_beat_goal AND _points > 0 THEN 1 ELSE 0 END,
    updated_at = now()
  WHERE user_id = _user_id AND company_id = _company_id;
END;
$$;
