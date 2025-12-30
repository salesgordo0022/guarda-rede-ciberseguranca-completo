
-- Script para recalcular os pontos das atividades já concluídas
-- Primeiro, zerar todos os scores para recalcular do zero
UPDATE user_scores SET 
  current_score = 0, 
  total_cycles_completed = 0, 
  beat_goal_count = 0, 
  on_time_count = 0,
  updated_at = now();

-- Agora adicionar pontos para cada atividade de departamento concluída com sucesso
DO $$
DECLARE
  _rec RECORD;
  _company_id uuid;
  _points integer;
  _is_beat_goal boolean;
BEGIN
  -- Processar atividades de departamento
  FOR _rec IN 
    SELECT da.id, da.deadline_status, da.department_id, daa.user_id
    FROM department_activities da
    JOIN department_activity_assignees daa ON da.id = daa.activity_id
    JOIN departments d ON da.department_id = d.id
    WHERE da.status = 'concluida' 
    AND da.deadline_status IN ('bateu_meta', 'concluido_no_prazo')
  LOOP
    -- Obtém company_id
    SELECT d.company_id INTO _company_id
    FROM departments d WHERE d.id = _rec.department_id;
    
    -- Determina pontos
    IF _rec.deadline_status = 'bateu_meta' THEN
      _points := 10;
      _is_beat_goal := true;
    ELSE
      _points := 5;
      _is_beat_goal := false;
    END IF;
    
    -- Adiciona pontos
    PERFORM add_user_score(_rec.user_id, _company_id, _points, _is_beat_goal);
  END LOOP;
  
  -- Processar atividades de projeto
  FOR _rec IN 
    SELECT pa.id, pa.deadline_status, pa.project_id, paa.user_id
    FROM project_activities pa
    JOIN project_activity_assignees paa ON pa.id = paa.activity_id
    JOIN projects p ON pa.project_id = p.id
    WHERE pa.status = 'concluida' 
    AND pa.deadline_status IN ('bateu_meta', 'concluido_no_prazo')
  LOOP
    -- Obtém company_id
    SELECT p.company_id INTO _company_id
    FROM projects p WHERE p.id = _rec.project_id;
    
    -- Determina pontos
    IF _rec.deadline_status = 'bateu_meta' THEN
      _points := 10;
      _is_beat_goal := true;
    ELSE
      _points := 5;
      _is_beat_goal := false;
    END IF;
    
    -- Adiciona pontos
    PERFORM add_user_score(_rec.user_id, _company_id, _points, _is_beat_goal);
  END LOOP;
END;
$$;
