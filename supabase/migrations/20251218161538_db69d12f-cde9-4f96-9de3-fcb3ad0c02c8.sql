-- Adicionar campos de recorrência na tabela department_activities
ALTER TABLE public.department_activities
ADD COLUMN is_recurring BOOLEAN DEFAULT false,
ADD COLUMN recurrence_type TEXT CHECK (recurrence_type IN ('daily', 'weekly', 'monthly')),
ADD COLUMN recurrence_day INTEGER, -- dia da semana (0-6) para semanal, dia do mês (1-31) para mensal
ADD COLUMN recurrence_active BOOLEAN DEFAULT true,
ADD COLUMN parent_activity_id UUID REFERENCES public.department_activities(id) ON DELETE SET NULL,
ADD COLUMN last_recurrence_date DATE;

-- Criar índice para buscar atividades recorrentes ativas
CREATE INDEX idx_department_activities_recurring 
ON public.department_activities(is_recurring, recurrence_active) 
WHERE is_recurring = true AND recurrence_active = true;

-- Comentários para documentação
COMMENT ON COLUMN public.department_activities.is_recurring IS 'Indica se a atividade é recorrente';
COMMENT ON COLUMN public.department_activities.recurrence_type IS 'Tipo de recorrência: daily, weekly, monthly';
COMMENT ON COLUMN public.department_activities.recurrence_day IS 'Dia para recorrência: 0-6 para semanal (domingo=0), 1-31 para mensal';
COMMENT ON COLUMN public.department_activities.recurrence_active IS 'Se a recorrência está ativa';
COMMENT ON COLUMN public.department_activities.parent_activity_id IS 'ID da atividade pai (template de recorrência)';
COMMENT ON COLUMN public.department_activities.last_recurrence_date IS 'Data da última vez que a recorrência foi executada';