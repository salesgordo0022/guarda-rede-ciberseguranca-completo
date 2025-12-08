-- Criar tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('task_created', 'task_completed', 'task_assigned', 'deadline_approaching', 'comment_added')),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_for UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES project_activities(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_notifications_created_for ON notifications(created_for);
CREATE INDEX IF NOT EXISTS idx_notifications_created_by ON notifications(created_by);
CREATE INDEX IF NOT EXISTS idx_notifications_task_id ON notifications(task_id);
CREATE INDEX IF NOT EXISTS idx_notifications_project_id ON notifications(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Criar políticas para notificações
-- Usuários podem ler suas próprias notificações
CREATE POLICY "Users can read their own notifications" ON notifications
  FOR SELECT
  TO authenticated
  USING (created_for = auth.uid());

-- Usuários podem atualizar suas próprias notificações
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE
  TO authenticated
  USING (created_for = auth.uid())
  WITH CHECK (created_for = auth.uid());

-- Sistema pode inserir notificações
CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados de exemplo
INSERT INTO notifications (title, description, type, created_by, created_for, read) VALUES
('Nova tarefa atribuída', 'Você recebeu uma nova tarefa: "Preparar relatório mensal"', 'task_assigned', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', FALSE),
('Tarefa concluída', 'A tarefa "Configurar servidor" foi marcada como concluída', 'task_completed', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', FALSE),
('Prazo se aproximando', 'A tarefa "Enviar proposta" vence amanhã', 'deadline_approaching', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', FALSE);