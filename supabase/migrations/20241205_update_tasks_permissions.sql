-- Atualizar tabela tasks com novos campos
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('baixa', 'média', 'alta', 'urgente')) DEFAULT 'média';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS has_fine BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS fine_amount DECIMAL(10,2);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS fine_reason TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Criar tabela de histórico de tarefas
CREATE TABLE IF NOT EXISTS task_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('criada', 'atualizada', 'concluída', 'delegada', 'comentada')),
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criar tabela de comentários
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_tasks_department ON tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);

-- Habilitar RLS
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Atualizar políticas RLS para tasks baseadas em roles

-- Remover política antiga
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON tasks;

-- Políticas para ADMIN (role = 'admin')
CREATE POLICY "Admins can view all tasks" ON tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create tasks" ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all tasks" ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete all tasks" ON tasks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Políticas para GESTOR (role = 'gestor')
CREATE POLICY "Gestores can view department tasks" ON tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'gestor'
      AND (
        tasks.department_id = profiles.department_id
        OR tasks.department_id IS NULL
      )
    )
  );

CREATE POLICY "Gestores can create tasks" ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'gestor'
    )
  );

CREATE POLICY "Gestores can update department tasks" ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'gestor'
      AND (
        tasks.department_id = profiles.department_id
        OR tasks.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Gestores can delete own tasks" ON tasks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'gestor'
      AND tasks.created_by = auth.uid()
    )
  );

-- Políticas para COLABORADOR (role = 'colaborador')
CREATE POLICY "Colaboradores can view assigned tasks" ON tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'colaborador'
      AND tasks.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Colaboradores can update assigned tasks status" ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'colaborador'
      AND tasks.assigned_to = auth.uid()
    )
  );

-- Políticas para task_history
CREATE POLICY "Users can view task history" ON task_history
  FOR SELECT
  TO authenticated
  USING (
    -- Admin vê tudo
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
    OR
    -- Gestor vê histórico do departamento
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN tasks t ON t.id = task_history.task_id
      WHERE p.id = auth.uid() 
      AND p.role = 'gestor'
      AND t.department_id = p.department_id
    )
    OR
    -- Colaborador vê histórico das suas tarefas
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_history.task_id
      AND t.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Users can create task history" ON task_history
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Políticas para task_comments
CREATE POLICY "Users can view task comments" ON task_comments
  FOR SELECT
  TO authenticated
  USING (
    -- Admin vê tudo
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
    OR
    -- Gestor vê comentários do departamento
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN tasks t ON t.id = task_comments.task_id
      WHERE p.id = auth.uid() 
      AND p.role = 'gestor'
      AND t.department_id = p.department_id
    )
    OR
    -- Colaborador vê comentários das suas tarefas
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_comments.task_id
      AND t.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Users can create task comments" ON task_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own comments" ON task_comments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments" ON task_comments
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Função para registrar histórico automaticamente
CREATE OR REPLACE FUNCTION log_task_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO task_history (task_id, user_id, action, new_values)
    VALUES (NEW.id, NEW.created_by, 'criada', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status AND NEW.status = 'Feito' THEN
      INSERT INTO task_history (task_id, user_id, action, old_values, new_values)
      VALUES (NEW.id, auth.uid(), 'concluída', to_jsonb(OLD), to_jsonb(NEW));
    ELSIF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO task_history (task_id, user_id, action, old_values, new_values)
      VALUES (NEW.id, auth.uid(), 'delegada', to_jsonb(OLD), to_jsonb(NEW));
    ELSE
      INSERT INTO task_history (task_id, user_id, action, old_values, new_values)
      VALUES (NEW.id, auth.uid(), 'atualizada', to_jsonb(OLD), to_jsonb(NEW));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para histórico
DROP TRIGGER IF EXISTS task_history_trigger ON tasks;
CREATE TRIGGER task_history_trigger
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_history();

-- Atualizar função para calcular schedule_status
CREATE OR REPLACE FUNCTION calculate_schedule_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deadline IS NOT NULL THEN
    IF NEW.deadline < CURRENT_DATE AND NEW.status != 'Feito' THEN
      NEW.schedule_status = 'Atrasado';
    ELSE
      NEW.schedule_status = 'Dentro do prazo';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para calcular status
DROP TRIGGER IF EXISTS calculate_schedule_status_trigger ON tasks;
CREATE TRIGGER calculate_schedule_status_trigger
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION calculate_schedule_status();
