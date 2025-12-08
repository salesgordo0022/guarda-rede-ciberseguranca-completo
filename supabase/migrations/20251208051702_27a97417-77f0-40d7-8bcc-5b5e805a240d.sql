-- =============================================
-- SISTEMA CORPORATIVO MULTIEMPRESAS
-- Banco de Dados Completo
-- =============================================

-- 1. ENUM PARA ROLES DE USUÁRIO
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'colaborador');

-- 2. ENUM PARA STATUS DE ATIVIDADES
CREATE TYPE public.activity_status AS ENUM ('pendente', 'em_andamento', 'concluida', 'cancelada');

-- 3. ENUM PARA SITUAÇÃO DE PRAZO
CREATE TYPE public.deadline_status AS ENUM (
  'no_prazo',
  'fora_do_prazo', 
  'concluido_no_prazo',
  'concluido_atrasado',
  'bateu_meta'
);

-- =============================================
-- TABELAS PRINCIPAIS
-- =============================================

-- 4. TABELA DE PERFIS (extende auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. TABELA DE ROLES DE USUÁRIO (seguindo padrão seguro)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'colaborador',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 6. TABELA DE EMPRESAS
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT,
  description TEXT,
  logo_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. TABELA DE VÍNCULO USUÁRIO-EMPRESA
CREATE TABLE public.user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'colaborador',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

-- 8. TABELA DE DEPARTAMENTOS
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. TABELA DE VÍNCULO USUÁRIO-DEPARTAMENTO
CREATE TABLE public.user_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  is_manager BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, department_id)
);

-- 10. TABELA DE PROJETOS
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#10b981',
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'ativo',
  progress NUMERIC(5,2) DEFAULT 0,
  total_activities INTEGER DEFAULT 0,
  completed_activities INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. TABELA DE ATIVIDADES DE DEPARTAMENTO
CREATE TABLE public.department_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status activity_status DEFAULT 'pendente',
  deadline DATE,
  scheduled_date DATE,
  completed_at TIMESTAMPTZ,
  deadline_status deadline_status DEFAULT 'no_prazo',
  order_index INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. TABELA DE RESPONSÁVEIS DE ATIVIDADES DE DEPARTAMENTO
CREATE TABLE public.department_activity_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.department_activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (activity_id, user_id)
);

-- 13. TABELA DE ATIVIDADES DE PROJETO (transversais)
CREATE TABLE public.project_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status activity_status DEFAULT 'pendente',
  deadline DATE,
  scheduled_date DATE,
  completed_at TIMESTAMPTZ,
  deadline_status deadline_status DEFAULT 'no_prazo',
  kanban_column TEXT DEFAULT 'no_prazo',
  order_index INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. TABELA DE RESPONSÁVEIS DE ATIVIDADES DE PROJETO (pode incluir múltiplos departamentos)
CREATE TABLE public.project_activity_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.project_activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (activity_id, user_id)
);

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_companies_user_id ON public.user_companies(user_id);
CREATE INDEX idx_user_companies_company_id ON public.user_companies(company_id);
CREATE INDEX idx_departments_company_id ON public.departments(company_id);
CREATE INDEX idx_user_departments_user_id ON public.user_departments(user_id);
CREATE INDEX idx_user_departments_department_id ON public.user_departments(department_id);
CREATE INDEX idx_projects_company_id ON public.projects(company_id);
CREATE INDEX idx_department_activities_department_id ON public.department_activities(department_id);
CREATE INDEX idx_department_activities_status ON public.department_activities(status);
CREATE INDEX idx_project_activities_project_id ON public.project_activities(project_id);
CREATE INDEX idx_project_activities_status ON public.project_activities(status);
CREATE INDEX idx_project_activities_kanban ON public.project_activities(kanban_column);

-- =============================================
-- FUNÇÕES AUXILIARES
-- =============================================

-- Função para verificar se usuário tem determinado role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para verificar se usuário pertence a uma empresa
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_companies
    WHERE user_id = _user_id
      AND company_id = _company_id
  )
$$;

-- Função para verificar se usuário pertence a um departamento
CREATE OR REPLACE FUNCTION public.user_belongs_to_department(_user_id UUID, _department_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_departments
    WHERE user_id = _user_id
      AND department_id = _department_id
  )
$$;

-- Função para obter role do usuário em uma empresa
CREATE OR REPLACE FUNCTION public.get_user_company_role(_user_id UUID, _company_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_companies
  WHERE user_id = _user_id
    AND company_id = _company_id
  LIMIT 1
$$;

-- =============================================
-- TRIGGERS
-- =============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_department_activities_updated_at
  BEFORE UPDATE ON public.department_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_activities_updated_at
  BEFORE UPDATE ON public.project_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para calcular situação de prazo
CREATE OR REPLACE FUNCTION public.calculate_deadline_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Se não tem deadline, mantém 'no_prazo'
  IF NEW.deadline IS NULL THEN
    NEW.deadline_status = 'no_prazo';
    NEW.kanban_column = 'no_prazo';
    RETURN NEW;
  END IF;
  
  -- Se foi concluída
  IF NEW.status = 'concluida' THEN
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at = now();
    END IF;
    
    -- Bateu a meta (concluída antes do prazo)
    IF NEW.completed_at::date < NEW.deadline THEN
      NEW.deadline_status = 'bateu_meta';
      NEW.kanban_column = 'bateu_meta';
    -- Concluída no prazo
    ELSIF NEW.completed_at::date = NEW.deadline THEN
      NEW.deadline_status = 'concluido_no_prazo';
      NEW.kanban_column = 'concluidas';
    -- Concluída atrasada
    ELSE
      NEW.deadline_status = 'concluido_atrasado';
      NEW.kanban_column = 'concluidas';
    END IF;
  -- Se não foi concluída
  ELSE
    NEW.completed_at = NULL;
    -- No prazo
    IF CURRENT_DATE <= NEW.deadline THEN
      NEW.deadline_status = 'no_prazo';
      NEW.kanban_column = 'no_prazo';
    -- Fora do prazo
    ELSE
      NEW.deadline_status = 'fora_do_prazo';
      NEW.kanban_column = 'fora_prazo';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular deadline_status em atividades de departamento
CREATE TRIGGER calculate_department_activity_deadline
  BEFORE INSERT OR UPDATE ON public.department_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_deadline_status();

-- Trigger para calcular deadline_status em atividades de projeto
CREATE TRIGGER calculate_project_activity_deadline
  BEFORE INSERT OR UPDATE ON public.project_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_deadline_status();

-- Função para atualizar progresso do projeto
CREATE OR REPLACE FUNCTION public.update_project_progress()
RETURNS TRIGGER AS $$
DECLARE
  _total INTEGER;
  _completed INTEGER;
  _progress NUMERIC(5,2);
BEGIN
  -- Conta total de atividades do projeto
  SELECT COUNT(*) INTO _total
  FROM public.project_activities
  WHERE project_id = COALESCE(NEW.project_id, OLD.project_id);
  
  -- Conta atividades concluídas
  SELECT COUNT(*) INTO _completed
  FROM public.project_activities
  WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    AND status = 'concluida';
  
  -- Calcula progresso
  IF _total > 0 THEN
    _progress = (_completed::NUMERIC / _total::NUMERIC) * 100;
  ELSE
    _progress = 0;
  END IF;
  
  -- Atualiza projeto
  UPDATE public.projects
  SET 
    total_activities = _total,
    completed_activities = _completed,
    progress = _progress,
    updated_at = now()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar progresso do projeto
CREATE TRIGGER update_project_progress_on_activity_change
  AFTER INSERT OR UPDATE OR DELETE ON public.project_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_progress();

-- Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email
  );
  
  -- Adiciona role padrão de colaborador
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'colaborador');
  
  RETURN NEW;
END;
$$;

-- Trigger para criar perfil quando usuário é criado
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_activity_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_activity_assignees ENABLE ROW LEVEL SECURITY;

-- Políticas para PROFILES
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Políticas para USER_ROLES
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Políticas para COMPANIES
CREATE POLICY "Users can view companies they belong to"
  ON public.companies FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), id) OR created_by = auth.uid());

CREATE POLICY "Admins can create companies"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update their companies"
  ON public.companies FOR UPDATE
  TO authenticated
  USING (
    public.get_user_company_role(auth.uid(), id) = 'admin'
    OR created_by = auth.uid()
  );

CREATE POLICY "Admins can delete their companies"
  ON public.companies FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Políticas para USER_COMPANIES
CREATE POLICY "Users can view their company memberships"
  ON public.user_companies FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Admins can manage company memberships"
  ON public.user_companies FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_company_role(auth.uid(), company_id) = 'admin'
    OR (SELECT created_by FROM public.companies WHERE id = company_id) = auth.uid()
  );

CREATE POLICY "Admins can update company memberships"
  ON public.user_companies FOR UPDATE
  TO authenticated
  USING (
    public.get_user_company_role(auth.uid(), company_id) = 'admin'
    OR (SELECT created_by FROM public.companies WHERE id = company_id) = auth.uid()
  );

CREATE POLICY "Admins can delete company memberships"
  ON public.user_companies FOR DELETE
  TO authenticated
  USING (
    public.get_user_company_role(auth.uid(), company_id) = 'admin'
    OR (SELECT created_by FROM public.companies WHERE id = company_id) = auth.uid()
  );

-- Políticas para DEPARTMENTS
CREATE POLICY "Users can view departments of their companies"
  ON public.departments FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Admins can create departments"
  ON public.departments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_company_role(auth.uid(), company_id) = 'admin'
  );

CREATE POLICY "Admins can update departments"
  ON public.departments FOR UPDATE
  TO authenticated
  USING (
    public.get_user_company_role(auth.uid(), company_id) = 'admin'
  );

CREATE POLICY "Admins can delete departments"
  ON public.departments FOR DELETE
  TO authenticated
  USING (
    public.get_user_company_role(auth.uid(), company_id) = 'admin'
  );

-- Políticas para USER_DEPARTMENTS
CREATE POLICY "Users can view department memberships of their companies"
  ON public.user_departments FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.departments d
      WHERE d.id = department_id
        AND public.user_belongs_to_company(auth.uid(), d.company_id)
    )
  );

CREATE POLICY "Admins can manage department memberships"
  ON public.user_departments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.departments d
      WHERE d.id = department_id
        AND public.get_user_company_role(auth.uid(), d.company_id) = 'admin'
    )
  );

CREATE POLICY "Admins can update department memberships"
  ON public.user_departments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.departments d
      WHERE d.id = department_id
        AND public.get_user_company_role(auth.uid(), d.company_id) = 'admin'
    )
  );

CREATE POLICY "Admins can delete department memberships"
  ON public.user_departments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.departments d
      WHERE d.id = department_id
        AND public.get_user_company_role(auth.uid(), d.company_id) = 'admin'
    )
  );

-- Políticas para PROJECTS
CREATE POLICY "Users can view projects of their companies"
  ON public.projects FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Admins can create projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_company_role(auth.uid(), company_id) = 'admin'
  );

CREATE POLICY "Admins and Gestors can update projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (
    public.get_user_company_role(auth.uid(), company_id) IN ('admin', 'gestor')
  );

CREATE POLICY "Admins can delete projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (
    public.get_user_company_role(auth.uid(), company_id) = 'admin'
  );

-- Políticas para DEPARTMENT_ACTIVITIES
CREATE POLICY "Users can view department activities"
  ON public.department_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.departments d
      WHERE d.id = department_id
        AND public.user_belongs_to_company(auth.uid(), d.company_id)
    )
  );

CREATE POLICY "Admins and Gestors can create department activities"
  ON public.department_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.departments d
      WHERE d.id = department_id
        AND public.get_user_company_role(auth.uid(), d.company_id) IN ('admin', 'gestor')
    )
  );

CREATE POLICY "Admins, Gestors and assignees can update department activities"
  ON public.department_activities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.departments d
      WHERE d.id = department_id
        AND public.get_user_company_role(auth.uid(), d.company_id) IN ('admin', 'gestor')
    )
    OR EXISTS (
      SELECT 1 FROM public.department_activity_assignees
      WHERE activity_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and Gestors can delete department activities"
  ON public.department_activities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.departments d
      WHERE d.id = department_id
        AND public.get_user_company_role(auth.uid(), d.company_id) IN ('admin', 'gestor')
    )
  );

-- Políticas para DEPARTMENT_ACTIVITY_ASSIGNEES
CREATE POLICY "Users can view department activity assignees"
  ON public.department_activity_assignees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.department_activities da
      JOIN public.departments d ON d.id = da.department_id
      WHERE da.id = activity_id
        AND public.user_belongs_to_company(auth.uid(), d.company_id)
    )
  );

CREATE POLICY "Admins and Gestors can manage department activity assignees"
  ON public.department_activity_assignees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.department_activities da
      JOIN public.departments d ON d.id = da.department_id
      WHERE da.id = activity_id
        AND public.get_user_company_role(auth.uid(), d.company_id) IN ('admin', 'gestor')
    )
  );

CREATE POLICY "Admins and Gestors can delete department activity assignees"
  ON public.department_activity_assignees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.department_activities da
      JOIN public.departments d ON d.id = da.department_id
      WHERE da.id = activity_id
        AND public.get_user_company_role(auth.uid(), d.company_id) IN ('admin', 'gestor')
    )
  );

-- Políticas para PROJECT_ACTIVITIES
CREATE POLICY "Users can view project activities"
  ON public.project_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND public.user_belongs_to_company(auth.uid(), p.company_id)
    )
  );

CREATE POLICY "Admins and Gestors can create project activities"
  ON public.project_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND public.get_user_company_role(auth.uid(), p.company_id) IN ('admin', 'gestor')
    )
  );

CREATE POLICY "Admins, Gestors and assignees can update project activities"
  ON public.project_activities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND public.get_user_company_role(auth.uid(), p.company_id) IN ('admin', 'gestor')
    )
    OR EXISTS (
      SELECT 1 FROM public.project_activity_assignees
      WHERE activity_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and Gestors can delete project activities"
  ON public.project_activities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND public.get_user_company_role(auth.uid(), p.company_id) IN ('admin', 'gestor')
    )
  );

-- Políticas para PROJECT_ACTIVITY_ASSIGNEES
CREATE POLICY "Users can view project activity assignees"
  ON public.project_activity_assignees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_activities pa
      JOIN public.projects p ON p.id = pa.project_id
      WHERE pa.id = activity_id
        AND public.user_belongs_to_company(auth.uid(), p.company_id)
    )
  );

CREATE POLICY "Admins and Gestors can manage project activity assignees"
  ON public.project_activity_assignees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_activities pa
      JOIN public.projects p ON p.id = pa.project_id
      WHERE pa.id = activity_id
        AND public.get_user_company_role(auth.uid(), p.company_id) IN ('admin', 'gestor')
    )
  );

CREATE POLICY "Admins and Gestors can delete project activity assignees"
  ON public.project_activity_assignees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_activities pa
      JOIN public.projects p ON p.id = pa.project_id
      WHERE pa.id = activity_id
        AND public.get_user_company_role(auth.uid(), p.company_id) IN ('admin', 'gestor')
    )
  );

-- =============================================
-- VIEWS PARA INDICADORES
-- =============================================

-- View para indicadores de projeto
CREATE OR REPLACE VIEW public.project_indicators AS
SELECT 
  p.id AS project_id,
  p.name AS project_name,
  p.company_id,
  p.progress,
  COUNT(pa.id) AS total_activities,
  COUNT(CASE WHEN pa.deadline_status = 'no_prazo' THEN 1 END) AS on_time_count,
  COUNT(CASE WHEN pa.deadline_status = 'fora_do_prazo' THEN 1 END) AS late_count,
  COUNT(CASE WHEN pa.deadline_status = 'concluido_no_prazo' THEN 1 END) AS completed_on_time_count,
  COUNT(CASE WHEN pa.deadline_status = 'concluido_atrasado' THEN 1 END) AS completed_late_count,
  COUNT(CASE WHEN pa.deadline_status = 'bateu_meta' THEN 1 END) AS beat_goal_count,
  COUNT(CASE WHEN pa.status = 'concluida' THEN 1 END) AS completed_count
FROM public.projects p
LEFT JOIN public.project_activities pa ON pa.project_id = p.id
GROUP BY p.id, p.name, p.company_id, p.progress;