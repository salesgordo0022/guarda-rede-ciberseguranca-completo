-- Criar tabela de tarefas
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  responsible TEXT,
  status TEXT NOT NULL CHECK (status IN ('Em andamento', 'Feito', 'Parado', 'Não iniciado')),
  deadline DATE,
  schedule_start DATE,
  schedule_end DATE,
  schedule_status TEXT CHECK (schedule_status IN ('Dentro do prazo', 'Atrasado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir todas as operações (ajuste conforme necessário)
CREATE POLICY "Enable all operations for authenticated users" ON tasks
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados de exemplo
INSERT INTO tasks (title, responsible, status, deadline, schedule_start, schedule_end, schedule_status) VALUES
('Material para Comprar', 'Luciano Nascimento', 'Em andamento', '2024-11-27', '2024-11-27', '2024-11-28', 'Atrasado'),
('Liberação do Link', NULL, 'Feito', '2024-11-28', '2024-11-29', '2024-11-30', 'Dentro do prazo'),
('Impressão de Apostila', NULL, 'Parado', '2024-11-29', '2024-12-01', '2024-12-02', 'Atrasado'),
('Alimentação dos participantes', NULL, 'Não iniciado', NULL, NULL, NULL, NULL),
('Configurar o Som 4 canais', NULL, 'Não iniciado', NULL, NULL, NULL, NULL);
