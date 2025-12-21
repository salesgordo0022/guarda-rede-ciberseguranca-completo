-- Criar trigger para calcular deadline_status em department_activities
DROP TRIGGER IF EXISTS trg_calculate_department_deadline_status ON department_activities;
CREATE TRIGGER trg_calculate_department_deadline_status
  BEFORE INSERT OR UPDATE ON department_activities
  FOR EACH ROW
  EXECUTE FUNCTION calculate_department_deadline_status();

-- Criar trigger para calcular deadline_status em project_activities
DROP TRIGGER IF EXISTS trg_calculate_deadline_status ON project_activities;
CREATE TRIGGER trg_calculate_deadline_status
  BEFORE INSERT OR UPDATE ON project_activities
  FOR EACH ROW
  EXECUTE FUNCTION calculate_deadline_status();

-- Criar trigger para atualizar updated_at em department_activities
DROP TRIGGER IF EXISTS trg_update_department_activities_updated_at ON department_activities;
CREATE TRIGGER trg_update_department_activities_updated_at
  BEFORE UPDATE ON department_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Criar trigger para atualizar updated_at em project_activities
DROP TRIGGER IF EXISTS trg_update_project_activities_updated_at ON project_activities;
CREATE TRIGGER trg_update_project_activities_updated_at
  BEFORE UPDATE ON project_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Criar trigger para atualizar progresso do projeto
DROP TRIGGER IF EXISTS trg_update_project_progress ON project_activities;
CREATE TRIGGER trg_update_project_progress
  AFTER INSERT OR UPDATE OR DELETE ON project_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_project_progress();