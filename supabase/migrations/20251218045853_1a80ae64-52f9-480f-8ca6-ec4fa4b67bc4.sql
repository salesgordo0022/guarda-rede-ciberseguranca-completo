-- Criar tabela de scores para gamificação
CREATE TABLE public.user_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  current_score INTEGER NOT NULL DEFAULT 0,
  total_cycles_completed INTEGER NOT NULL DEFAULT 0,
  beat_goal_count INTEGER NOT NULL DEFAULT 0,
  on_time_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Enable RLS
ALTER TABLE public.user_scores ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view scores of their company"
ON public.user_scores
FOR SELECT
USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "System can insert scores"
ON public.user_scores
FOR INSERT
WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Admins can update scores"
ON public.user_scores
FOR UPDATE
USING (get_user_company_role(auth.uid(), company_id) = 'admin');

CREATE POLICY "Users can update their own score"
ON public.user_scores
FOR UPDATE
USING (user_id = auth.uid());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_scores_updated_at
BEFORE UPDATE ON public.user_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para adicionar pontos ao usuário
CREATE OR REPLACE FUNCTION public.add_user_score(
  _user_id UUID,
  _company_id UUID,
  _points INTEGER,
  _is_beat_goal BOOLEAN DEFAULT FALSE
)
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
  -- Inserir ou obter registro existente
  INSERT INTO public.user_scores (user_id, company_id, current_score)
  VALUES (_user_id, _company_id, 0)
  ON CONFLICT (user_id, company_id) DO NOTHING;
  
  -- Obter score atual
  SELECT current_score INTO _current_score
  FROM public.user_scores
  WHERE user_id = _user_id AND company_id = _company_id;
  
  _new_score := _current_score + _points;
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
    on_time_count = on_time_count + CASE WHEN NOT _is_beat_goal AND _points > 0 THEN 1 ELSE 0 END
  WHERE user_id = _user_id AND company_id = _company_id;
END;
$$;

-- Função para resetar score (admin only)
CREATE OR REPLACE FUNCTION public.reset_user_score(
  _user_id UUID,
  _company_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se quem está chamando é admin
  IF get_user_company_role(auth.uid(), _company_id) != 'admin' THEN
    RAISE EXCEPTION 'Only admins can reset scores';
  END IF;
  
  UPDATE public.user_scores
  SET 
    current_score = 0,
    beat_goal_count = 0,
    on_time_count = 0,
    total_cycles_completed = 0
  WHERE user_id = _user_id AND company_id = _company_id;
END;
$$;