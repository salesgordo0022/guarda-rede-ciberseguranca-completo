-- Criar tabela para armazenar configurações do sistema
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserir configurações padrão de cores
INSERT INTO system_settings (key, value) VALUES
  ('category_colors', '{
    "obligations": "#eab308",
    "action": "#ea580c",
    "attention": "#6b7280",
    "pending": "#22c55e",
    "completed": "#9333ea"
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Inserir configuração de tema padrão
INSERT INTO system_settings (key, value) VALUES
  ('theme', '{"name": "light", "label": "Claro"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Habilitar RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Política para leitura (todos podem ler)
CREATE POLICY "Todos podem ler configurações"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para atualização (apenas admins)
CREATE POLICY "Apenas admins podem atualizar configurações"
  ON system_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();
