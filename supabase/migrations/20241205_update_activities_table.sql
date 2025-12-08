-- Adicionar novos campos à tabela activities
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS responsible TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Não iniciado' CHECK (status IN ('Em andamento', 'Feito', 'Parado', 'Não iniciado')),
ADD COLUMN IF NOT EXISTS deadline DATE,
ADD COLUMN IF NOT EXISTS schedule_start DATE,
ADD COLUMN IF NOT EXISTS schedule_end DATE,
ADD COLUMN IF NOT EXISTS schedule_status TEXT CHECK (schedule_status IN ('Dentro do prazo', 'Atrasado'));

-- Atualizar atividades existentes para ter status padrão
UPDATE activities 
SET status = 'Não iniciado' 
WHERE status IS NULL;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_deadline ON activities(deadline);

-- Comentários para documentação
COMMENT ON COLUMN activities.responsible IS 'Nome da pessoa responsável pela atividade';
COMMENT ON COLUMN activities.status IS 'Status atual: Em andamento, Feito, Parado, Não iniciado';
COMMENT ON COLUMN activities.deadline IS 'Data limite para conclusão';
COMMENT ON COLUMN activities.schedule_start IS 'Data de início do cronograma planejado';
COMMENT ON COLUMN activities.schedule_end IS 'Data de fim do cronograma planejado';
COMMENT ON COLUMN activities.schedule_status IS 'Situação calculada: Dentro do prazo ou Atrasado';
