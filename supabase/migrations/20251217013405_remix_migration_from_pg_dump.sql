CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: activity_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.activity_status AS ENUM (
    'pendente',
    'em_andamento',
    'concluida',
    'cancelada'
);


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'gestor',
    'colaborador'
);


--
-- Name: deadline_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.deadline_status AS ENUM (
    'no_prazo',
    'fora_do_prazo',
    'concluido_no_prazo',
    'concluido_atrasado',
    'bateu_meta'
);


--
-- Name: calculate_deadline_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_deadline_status() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: calculate_department_deadline_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_department_deadline_status() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Se não tem deadline, mantém 'no_prazo'
  IF NEW.deadline IS NULL THEN
    NEW.deadline_status = 'no_prazo';
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
    -- Concluída no prazo
    ELSIF NEW.completed_at::date = NEW.deadline THEN
      NEW.deadline_status = 'concluido_no_prazo';
    -- Concluída atrasada
    ELSE
      NEW.deadline_status = 'concluido_atrasado';
    END IF;
  -- Se não foi concluída
  ELSE
    NEW.completed_at = NULL;
    -- No prazo
    IF CURRENT_DATE <= NEW.deadline THEN
      NEW.deadline_status = 'no_prazo';
    -- Fora do prazo
    ELSE
      NEW.deadline_status = 'fora_do_prazo';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: can_update_department_activity(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_update_department_activity(activity_id uuid, user_uuid uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  dept_company_id uuid;
  user_role app_role;
BEGIN
  -- Get the company_id from the department
  SELECT d.company_id INTO dept_company_id
  FROM department_activities da
  JOIN departments d ON d.id = da.department_id
  WHERE da.id = activity_id;
  
  IF dept_company_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check user role in company
  SELECT uc.role INTO user_role
  FROM user_companies uc
  WHERE uc.user_id = user_uuid AND uc.company_id = dept_company_id;
  
  -- Admins and gestors can update
  RETURN user_role IN ('admin', 'gestor');
END;
$$;


--
-- Name: can_update_project_activity(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_update_project_activity(activity_id uuid, user_uuid uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  project_company_id uuid;
  user_role app_role;
  is_assignee boolean;
BEGIN
  -- Get the company_id from the project
  SELECT p.company_id INTO project_company_id
  FROM project_activities pa
  JOIN projects p ON p.id = pa.project_id
  WHERE pa.id = activity_id;
  
  IF project_company_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check user role in company
  SELECT uc.role INTO user_role
  FROM user_companies uc
  WHERE uc.user_id = user_uuid AND uc.company_id = project_company_id;
  
  -- Admins and gestors can update
  IF user_role IN ('admin', 'gestor') THEN
    RETURN true;
  END IF;
  
  -- Check if user is assignee
  SELECT EXISTS(
    SELECT 1 FROM project_activity_assignees paa
    WHERE paa.activity_id = can_update_project_activity.activity_id 
    AND paa.user_id = user_uuid
  ) INTO is_assignee;
  
  RETURN is_assignee;
END;
$$;


--
-- Name: get_user_company_role(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_company_role(_user_id uuid, _company_id uuid) RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role
  FROM public.user_companies
  WHERE user_id = _user_id
    AND company_id = _company_id
  LIMIT 1
$$;


--
-- Name: handle_new_company(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_company() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Vincula o criador da empresa como admin
  INSERT INTO public.user_companies (user_id, company_id, role)
  VALUES (NEW.created_by, NEW.id, 'admin')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  user_count INTEGER;
  new_role app_role;
BEGIN
  -- Conta quantos usuários já existem
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- Se não houver nenhum usuário, o primeiro será admin
  IF user_count = 0 THEN
    new_role := 'admin';
  ELSE
    new_role := 'colaborador';
  END IF;
  
  -- Insere o perfil
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email
  );
  
  -- Adiciona a role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, new_role);
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: notify_department_activity_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_department_activity_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  dept_record RECORD;
  action_text TEXT;
  admin_record RECORD;
  assignee_record RECORD;
  actor_name TEXT;
  current_user_id uuid;
BEGIN
  -- Get the current user id
  current_user_id := auth.uid();
  
  -- Buscar informações do departamento
  SELECT d.*, d.company_id 
  INTO dept_record 
  FROM departments d
  WHERE d.id = COALESCE(NEW.department_id, OLD.department_id);
  
  -- Determinar a ação
  IF TG_OP = 'INSERT' THEN
    action_text := 'criada';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'concluida' AND OLD.status != 'concluida' THEN
      action_text := 'concluída';
    ELSE
      action_text := 'atualizada';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    action_text := 'removida';
  END IF;
  
  -- Buscar nome do usuário que fez a ação
  SELECT full_name INTO actor_name FROM profiles WHERE id = current_user_id;
  
  -- Notificar todos os admins da empresa (incluindo quem fez a ação)
  FOR admin_record IN 
    SELECT uc.user_id 
    FROM user_companies uc 
    WHERE uc.company_id = dept_record.company_id 
    AND uc.role = 'admin'
  LOOP
    INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id, created_by)
    VALUES (
      admin_record.user_id,
      'Atividade ' || action_text,
      'A atividade "' || COALESCE(NEW.name, OLD.name) || '" do departamento "' || dept_record.name || '" foi ' || action_text || ' por ' || COALESCE(actor_name, 'sistema'),
      CASE WHEN action_text = 'concluída' THEN 'success' WHEN action_text = 'removida' THEN 'warning' ELSE 'info' END,
      'department_activity',
      COALESCE(NEW.id, OLD.id),
      current_user_id
    );
  END LOOP;
  
  -- Notificar gestores do departamento (exceto quem fez a ação)
  FOR admin_record IN 
    SELECT ud.user_id 
    FROM user_departments ud
    JOIN user_companies uc ON uc.user_id = ud.user_id AND uc.company_id = dept_record.company_id
    WHERE ud.department_id = dept_record.id
    AND (ud.is_manager = true OR uc.role = 'gestor')
    AND ud.user_id != current_user_id
  LOOP
    INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id, created_by)
    VALUES (
      admin_record.user_id,
      'Atividade ' || action_text,
      'A atividade "' || COALESCE(NEW.name, OLD.name) || '" do departamento "' || dept_record.name || '" foi ' || action_text || ' por ' || COALESCE(actor_name, 'sistema'),
      CASE WHEN action_text = 'concluída' THEN 'success' WHEN action_text = 'removida' THEN 'warning' ELSE 'info' END,
      'department_activity',
      COALESCE(NEW.id, OLD.id),
      current_user_id
    );
  END LOOP;
  
  -- Notificar colaboradores assignados à atividade (exceto quem fez a ação)
  IF TG_OP != 'INSERT' THEN
    FOR assignee_record IN 
      SELECT daa.user_id 
      FROM department_activity_assignees daa
      JOIN user_companies uc ON uc.user_id = daa.user_id AND uc.company_id = dept_record.company_id
      WHERE daa.activity_id = COALESCE(NEW.id, OLD.id)
      AND daa.user_id != current_user_id
      AND uc.role = 'colaborador'
    LOOP
      INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id, created_by)
      VALUES (
        assignee_record.user_id,
        'Atividade ' || action_text,
        'A atividade "' || COALESCE(NEW.name, OLD.name) || '" que você participa foi ' || action_text,
        CASE WHEN action_text = 'concluída' THEN 'success' WHEN action_text = 'removida' THEN 'warning' ELSE 'info' END,
        'department_activity',
        COALESCE(NEW.id, OLD.id),
        current_user_id
      );
    END LOOP;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: notify_project_activity_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_project_activity_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  project_record RECORD;
  action_text TEXT;
  admin_record RECORD;
  assignee_record RECORD;
  actor_name TEXT;
  current_user_id uuid;
BEGIN
  -- Get the current user id
  current_user_id := auth.uid();
  
  -- Buscar informações do projeto
  SELECT p.*, c.id as company_id 
  INTO project_record 
  FROM projects p
  JOIN companies c ON c.id = p.company_id
  WHERE p.id = COALESCE(NEW.project_id, OLD.project_id);
  
  -- Determinar a ação
  IF TG_OP = 'INSERT' THEN
    action_text := 'criada';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'concluida' AND OLD.status != 'concluida' THEN
      action_text := 'concluída';
    ELSE
      action_text := 'atualizada';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    action_text := 'removida';
  END IF;
  
  -- Buscar nome do usuário que fez a ação
  SELECT full_name INTO actor_name FROM profiles WHERE id = current_user_id;
  
  -- Notificar todos os admins da empresa (incluindo quem fez a ação)
  FOR admin_record IN 
    SELECT uc.user_id 
    FROM user_companies uc 
    WHERE uc.company_id = project_record.company_id 
    AND uc.role = 'admin'
  LOOP
    INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id, created_by)
    VALUES (
      admin_record.user_id,
      'Atividade ' || action_text,
      'A atividade "' || COALESCE(NEW.name, OLD.name) || '" do projeto "' || project_record.name || '" foi ' || action_text || ' por ' || COALESCE(actor_name, 'sistema'),
      CASE WHEN action_text = 'concluída' THEN 'success' WHEN action_text = 'removida' THEN 'warning' ELSE 'info' END,
      'project_activity',
      COALESCE(NEW.id, OLD.id),
      current_user_id
    );
  END LOOP;
  
  -- Notificar gestores (exceto quem fez a ação)
  FOR admin_record IN 
    SELECT DISTINCT uc.user_id 
    FROM user_companies uc 
    WHERE uc.company_id = project_record.company_id 
    AND uc.role = 'gestor'
    AND uc.user_id != current_user_id
  LOOP
    INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id, created_by)
    VALUES (
      admin_record.user_id,
      'Atividade ' || action_text,
      'A atividade "' || COALESCE(NEW.name, OLD.name) || '" do projeto "' || project_record.name || '" foi ' || action_text || ' por ' || COALESCE(actor_name, 'sistema'),
      CASE WHEN action_text = 'concluída' THEN 'success' WHEN action_text = 'removida' THEN 'warning' ELSE 'info' END,
      'project_activity',
      COALESCE(NEW.id, OLD.id),
      current_user_id
    );
  END LOOP;
  
  -- Notificar colaboradores assignados à atividade (exceto quem fez a ação)
  IF TG_OP != 'INSERT' THEN
    FOR assignee_record IN 
      SELECT paa.user_id 
      FROM project_activity_assignees paa
      JOIN user_companies uc ON uc.user_id = paa.user_id AND uc.company_id = project_record.company_id
      WHERE paa.activity_id = COALESCE(NEW.id, OLD.id)
      AND paa.user_id != current_user_id
      AND uc.role = 'colaborador'
    LOOP
      INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id, created_by)
      VALUES (
        assignee_record.user_id,
        'Atividade ' || action_text,
        'A atividade "' || COALESCE(NEW.name, OLD.name) || '" que você participa foi ' || action_text,
        CASE WHEN action_text = 'concluída' THEN 'success' WHEN action_text = 'removida' THEN 'warning' ELSE 'info' END,
        'project_activity',
        COALESCE(NEW.id, OLD.id),
        current_user_id
      );
    END LOOP;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: update_project_progress(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_project_progress() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: user_belongs_to_company(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_belongs_to_company(_user_id uuid, _company_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_companies
    WHERE user_id = _user_id
      AND company_id = _company_id
  )
$$;


--
-- Name: user_belongs_to_department(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_belongs_to_department(_user_id uuid, _department_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_departments
    WHERE user_id = _user_id
      AND department_id = _department_id
  )
$$;


SET default_table_access_method = heap;

--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    cnpj text,
    description text,
    logo_url text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: department_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.department_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    status public.activity_status DEFAULT 'pendente'::public.activity_status,
    deadline date,
    schedule_start date,
    completed_at timestamp with time zone,
    deadline_status public.deadline_status DEFAULT 'no_prazo'::public.deadline_status,
    order_index integer DEFAULT 0,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    schedule_end date
);


--
-- Name: department_activity_assignees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.department_activity_assignees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    activity_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    color text DEFAULT '#3b82f6'::text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info'::text NOT NULL,
    entity_type text,
    entity_id uuid,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: project_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    status public.activity_status DEFAULT 'pendente'::public.activity_status,
    deadline date,
    schedule_start date,
    completed_at timestamp with time zone,
    deadline_status public.deadline_status DEFAULT 'no_prazo'::public.deadline_status,
    kanban_column text DEFAULT 'no_prazo'::text,
    order_index integer DEFAULT 0,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    schedule_end date
);


--
-- Name: project_activity_assignees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_activity_assignees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    activity_id uuid NOT NULL,
    user_id uuid NOT NULL,
    department_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    color text DEFAULT '#10b981'::text,
    start_date date,
    end_date date,
    status text DEFAULT 'ativo'::text,
    progress numeric(5,2) DEFAULT 0,
    total_activities integer DEFAULT 0,
    completed_activities integer DEFAULT 0,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: project_indicators; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.project_indicators AS
 SELECT p.id AS project_id,
    p.name AS project_name,
    p.company_id,
    p.progress,
    count(pa.id) AS total_activities,
    count(
        CASE
            WHEN (pa.deadline_status = 'no_prazo'::public.deadline_status) THEN 1
            ELSE NULL::integer
        END) AS on_time_count,
    count(
        CASE
            WHEN (pa.deadline_status = 'fora_do_prazo'::public.deadline_status) THEN 1
            ELSE NULL::integer
        END) AS late_count,
    count(
        CASE
            WHEN (pa.deadline_status = 'concluido_no_prazo'::public.deadline_status) THEN 1
            ELSE NULL::integer
        END) AS completed_on_time_count,
    count(
        CASE
            WHEN (pa.deadline_status = 'concluido_atrasado'::public.deadline_status) THEN 1
            ELSE NULL::integer
        END) AS completed_late_count,
    count(
        CASE
            WHEN (pa.deadline_status = 'bateu_meta'::public.deadline_status) THEN 1
            ELSE NULL::integer
        END) AS beat_goal_count,
    count(
        CASE
            WHEN (pa.status = 'concluida'::public.activity_status) THEN 1
            ELSE NULL::integer
        END) AS completed_count
   FROM (public.projects p
     LEFT JOIN public.project_activities pa ON ((pa.project_id = p.id)))
  GROUP BY p.id, p.name, p.company_id, p.progress;


--
-- Name: user_companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    company_id uuid NOT NULL,
    role public.app_role DEFAULT 'colaborador'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    department_id uuid NOT NULL,
    is_manager boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'colaborador'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: department_activities department_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_activities
    ADD CONSTRAINT department_activities_pkey PRIMARY KEY (id);


--
-- Name: department_activity_assignees department_activity_assignees_activity_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_activity_assignees
    ADD CONSTRAINT department_activity_assignees_activity_id_user_id_key UNIQUE (activity_id, user_id);


--
-- Name: department_activity_assignees department_activity_assignees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_activity_assignees
    ADD CONSTRAINT department_activity_assignees_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: project_activities project_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_activities
    ADD CONSTRAINT project_activities_pkey PRIMARY KEY (id);


--
-- Name: project_activity_assignees project_activity_assignees_activity_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_activity_assignees
    ADD CONSTRAINT project_activity_assignees_activity_id_user_id_key UNIQUE (activity_id, user_id);


--
-- Name: project_activity_assignees project_activity_assignees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_activity_assignees
    ADD CONSTRAINT project_activity_assignees_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: user_companies user_companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_companies
    ADD CONSTRAINT user_companies_pkey PRIMARY KEY (id);


--
-- Name: user_companies user_companies_user_id_company_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_companies
    ADD CONSTRAINT user_companies_user_id_company_id_key UNIQUE (user_id, company_id);


--
-- Name: user_departments user_departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_departments
    ADD CONSTRAINT user_departments_pkey PRIMARY KEY (id);


--
-- Name: user_departments user_departments_user_id_department_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_departments
    ADD CONSTRAINT user_departments_user_id_department_id_key UNIQUE (user_id, department_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_department_activities_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_department_activities_department_id ON public.department_activities USING btree (department_id);


--
-- Name: idx_department_activities_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_department_activities_status ON public.department_activities USING btree (status);


--
-- Name: idx_departments_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_departments_company_id ON public.departments USING btree (company_id);


--
-- Name: idx_project_activities_kanban; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_activities_kanban ON public.project_activities USING btree (kanban_column);


--
-- Name: idx_project_activities_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_activities_project_id ON public.project_activities USING btree (project_id);


--
-- Name: idx_project_activities_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_activities_status ON public.project_activities USING btree (status);


--
-- Name: idx_projects_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_company_id ON public.projects USING btree (company_id);


--
-- Name: idx_user_companies_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_companies_company_id ON public.user_companies USING btree (company_id);


--
-- Name: idx_user_companies_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_companies_user_id ON public.user_companies USING btree (user_id);


--
-- Name: idx_user_departments_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_departments_department_id ON public.user_departments USING btree (department_id);


--
-- Name: idx_user_departments_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_departments_user_id ON public.user_departments USING btree (user_id);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- Name: department_activities calculate_department_activity_deadline; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER calculate_department_activity_deadline BEFORE INSERT OR UPDATE ON public.department_activities FOR EACH ROW EXECUTE FUNCTION public.calculate_department_deadline_status();


--
-- Name: project_activities calculate_project_activity_deadline; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER calculate_project_activity_deadline BEFORE INSERT OR UPDATE ON public.project_activities FOR EACH ROW EXECUTE FUNCTION public.calculate_deadline_status();


--
-- Name: department_activities notify_department_activity_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notify_department_activity_delete AFTER DELETE ON public.department_activities FOR EACH ROW EXECUTE FUNCTION public.notify_department_activity_change();


--
-- Name: department_activities notify_department_activity_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notify_department_activity_insert AFTER INSERT ON public.department_activities FOR EACH ROW EXECUTE FUNCTION public.notify_department_activity_change();


--
-- Name: department_activities notify_department_activity_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notify_department_activity_update AFTER UPDATE ON public.department_activities FOR EACH ROW EXECUTE FUNCTION public.notify_department_activity_change();


--
-- Name: project_activities notify_project_activity_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notify_project_activity_delete AFTER DELETE ON public.project_activities FOR EACH ROW EXECUTE FUNCTION public.notify_project_activity_change();


--
-- Name: project_activities notify_project_activity_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notify_project_activity_insert AFTER INSERT ON public.project_activities FOR EACH ROW EXECUTE FUNCTION public.notify_project_activity_change();


--
-- Name: project_activities notify_project_activity_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notify_project_activity_update AFTER UPDATE ON public.project_activities FOR EACH ROW EXECUTE FUNCTION public.notify_project_activity_change();


--
-- Name: companies on_company_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_company_created AFTER INSERT ON public.companies FOR EACH ROW EXECUTE FUNCTION public.handle_new_company();


--
-- Name: department_activities trigger_notify_department_activity_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_department_activity_change AFTER INSERT OR DELETE OR UPDATE ON public.department_activities FOR EACH ROW EXECUTE FUNCTION public.notify_department_activity_change();


--
-- Name: project_activities trigger_notify_project_activity_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_project_activity_change AFTER INSERT OR DELETE OR UPDATE ON public.project_activities FOR EACH ROW EXECUTE FUNCTION public.notify_project_activity_change();


--
-- Name: companies update_companies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: department_activities update_department_activities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_department_activities_updated_at BEFORE UPDATE ON public.department_activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: departments update_departments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_activities update_project_activities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_project_activities_updated_at BEFORE UPDATE ON public.project_activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_activities update_project_progress_on_activity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_project_progress_on_activity AFTER INSERT OR DELETE OR UPDATE ON public.project_activities FOR EACH ROW EXECUTE FUNCTION public.update_project_progress();


--
-- Name: project_activities update_project_progress_on_activity_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_project_progress_on_activity_change AFTER INSERT OR DELETE OR UPDATE ON public.project_activities FOR EACH ROW EXECUTE FUNCTION public.update_project_progress();


--
-- Name: projects update_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: companies companies_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: department_activities department_activities_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_activities
    ADD CONSTRAINT department_activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: department_activities department_activities_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_activities
    ADD CONSTRAINT department_activities_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: department_activity_assignees department_activity_assignees_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_activity_assignees
    ADD CONSTRAINT department_activity_assignees_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.department_activities(id) ON DELETE CASCADE;


--
-- Name: department_activity_assignees department_activity_assignees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_activity_assignees
    ADD CONSTRAINT department_activity_assignees_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: departments departments_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: departments departments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: project_activities project_activities_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_activities
    ADD CONSTRAINT project_activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: project_activities project_activities_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_activities
    ADD CONSTRAINT project_activities_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_activity_assignees project_activity_assignees_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_activity_assignees
    ADD CONSTRAINT project_activity_assignees_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.project_activities(id) ON DELETE CASCADE;


--
-- Name: project_activity_assignees project_activity_assignees_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_activity_assignees
    ADD CONSTRAINT project_activity_assignees_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: project_activity_assignees project_activity_assignees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_activity_assignees
    ADD CONSTRAINT project_activity_assignees_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: projects projects_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_companies user_companies_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_companies
    ADD CONSTRAINT user_companies_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: user_companies user_companies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_companies
    ADD CONSTRAINT user_companies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_departments user_departments_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_departments
    ADD CONSTRAINT user_departments_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: user_departments user_departments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_departments
    ADD CONSTRAINT user_departments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: department_activities Admins and Gestors can create department activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Gestors can create department activities" ON public.department_activities FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.departments d
  WHERE ((d.id = department_activities.department_id) AND (public.get_user_company_role(auth.uid(), d.company_id) = ANY (ARRAY['admin'::public.app_role, 'gestor'::public.app_role]))))));


--
-- Name: project_activities Admins and Gestors can create project activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Gestors can create project activities" ON public.project_activities FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_activities.project_id) AND (public.get_user_company_role(auth.uid(), p.company_id) = ANY (ARRAY['admin'::public.app_role, 'gestor'::public.app_role]))))));


--
-- Name: department_activities Admins and Gestors can delete department activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Gestors can delete department activities" ON public.department_activities FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.departments d
  WHERE ((d.id = department_activities.department_id) AND (public.get_user_company_role(auth.uid(), d.company_id) = ANY (ARRAY['admin'::public.app_role, 'gestor'::public.app_role]))))));


--
-- Name: department_activity_assignees Admins and Gestors can delete department activity assignees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Gestors can delete department activity assignees" ON public.department_activity_assignees FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.department_activities da
     JOIN public.departments d ON ((d.id = da.department_id)))
  WHERE ((da.id = department_activity_assignees.activity_id) AND (public.get_user_company_role(auth.uid(), d.company_id) = ANY (ARRAY['admin'::public.app_role, 'gestor'::public.app_role]))))));


--
-- Name: project_activities Admins and Gestors can delete project activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Gestors can delete project activities" ON public.project_activities FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_activities.project_id) AND (public.get_user_company_role(auth.uid(), p.company_id) = ANY (ARRAY['admin'::public.app_role, 'gestor'::public.app_role]))))));


--
-- Name: project_activity_assignees Admins and Gestors can delete project activity assignees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Gestors can delete project activity assignees" ON public.project_activity_assignees FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.project_activities pa
     JOIN public.projects p ON ((p.id = pa.project_id)))
  WHERE ((pa.id = project_activity_assignees.activity_id) AND (public.get_user_company_role(auth.uid(), p.company_id) = ANY (ARRAY['admin'::public.app_role, 'gestor'::public.app_role]))))));


--
-- Name: department_activity_assignees Admins and Gestors can manage department activity assignees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Gestors can manage department activity assignees" ON public.department_activity_assignees FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.department_activities da
     JOIN public.departments d ON ((d.id = da.department_id)))
  WHERE ((da.id = department_activity_assignees.activity_id) AND (public.get_user_company_role(auth.uid(), d.company_id) = ANY (ARRAY['admin'::public.app_role, 'gestor'::public.app_role]))))));


--
-- Name: project_activity_assignees Admins and Gestors can manage project activity assignees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Gestors can manage project activity assignees" ON public.project_activity_assignees FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.project_activities pa
     JOIN public.projects p ON ((p.id = pa.project_id)))
  WHERE ((pa.id = project_activity_assignees.activity_id) AND (public.get_user_company_role(auth.uid(), p.company_id) = ANY (ARRAY['admin'::public.app_role, 'gestor'::public.app_role]))))));


--
-- Name: projects Admins and Gestors can update projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and Gestors can update projects" ON public.projects FOR UPDATE TO authenticated USING ((public.get_user_company_role(auth.uid(), company_id) = ANY (ARRAY['admin'::public.app_role, 'gestor'::public.app_role])));


--
-- Name: companies Admins can create companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create companies" ON public.companies FOR INSERT TO authenticated WITH CHECK ((created_by = auth.uid()));


--
-- Name: departments Admins can create departments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create departments" ON public.departments FOR INSERT TO authenticated WITH CHECK ((public.get_user_company_role(auth.uid(), company_id) = 'admin'::public.app_role));


--
-- Name: projects Admins can create projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create projects" ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.get_user_company_role(auth.uid(), company_id) = 'admin'::public.app_role));


--
-- Name: user_companies Admins can delete company memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete company memberships" ON public.user_companies FOR DELETE TO authenticated USING (((public.get_user_company_role(auth.uid(), company_id) = 'admin'::public.app_role) OR (( SELECT companies.created_by
   FROM public.companies
  WHERE (companies.id = user_companies.company_id)) = auth.uid())));


--
-- Name: user_departments Admins can delete department memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete department memberships" ON public.user_departments FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.departments d
  WHERE ((d.id = user_departments.department_id) AND (public.get_user_company_role(auth.uid(), d.company_id) = 'admin'::public.app_role)))));


--
-- Name: departments Admins can delete departments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete departments" ON public.departments FOR DELETE TO authenticated USING ((public.get_user_company_role(auth.uid(), company_id) = 'admin'::public.app_role));


--
-- Name: projects Admins can delete projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete projects" ON public.projects FOR DELETE TO authenticated USING ((public.get_user_company_role(auth.uid(), company_id) = 'admin'::public.app_role));


--
-- Name: companies Admins can delete their companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete their companies" ON public.companies FOR DELETE TO authenticated USING ((created_by = auth.uid()));


--
-- Name: user_companies Admins can manage company memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage company memberships" ON public.user_companies FOR INSERT TO authenticated WITH CHECK (((public.get_user_company_role(auth.uid(), company_id) = 'admin'::public.app_role) OR (( SELECT companies.created_by
   FROM public.companies
  WHERE (companies.id = user_companies.company_id)) = auth.uid())));


--
-- Name: user_departments Admins can manage department memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage department memberships" ON public.user_departments FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.departments d
  WHERE ((d.id = user_departments.department_id) AND (public.get_user_company_role(auth.uid(), d.company_id) = 'admin'::public.app_role)))));


--
-- Name: user_companies Admins can update company memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update company memberships" ON public.user_companies FOR UPDATE TO authenticated USING (((public.get_user_company_role(auth.uid(), company_id) = 'admin'::public.app_role) OR (( SELECT companies.created_by
   FROM public.companies
  WHERE (companies.id = user_companies.company_id)) = auth.uid())));


--
-- Name: user_departments Admins can update department memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update department memberships" ON public.user_departments FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.departments d
  WHERE ((d.id = user_departments.department_id) AND (public.get_user_company_role(auth.uid(), d.company_id) = 'admin'::public.app_role)))));


--
-- Name: departments Admins can update departments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update departments" ON public.departments FOR UPDATE TO authenticated USING ((public.get_user_company_role(auth.uid(), company_id) = 'admin'::public.app_role));


--
-- Name: companies Admins can update their companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update their companies" ON public.companies FOR UPDATE TO authenticated USING (((public.get_user_company_role(auth.uid(), id) = 'admin'::public.app_role) OR (created_by = auth.uid())));


--
-- Name: notifications System can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);


--
-- Name: notifications Users can delete their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: department_activities Users can update department activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update department activities" ON public.department_activities FOR UPDATE USING (public.can_update_department_activity(id, auth.uid()));


--
-- Name: project_activities Users can update project activities they have access to; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update project activities they have access to" ON public.project_activities FOR UPDATE USING (public.can_update_project_activity(id, auth.uid()));


--
-- Name: notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid()));


--
-- Name: companies Users can view companies they belong to; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view companies they belong to" ON public.companies FOR SELECT TO authenticated USING ((public.user_belongs_to_company(auth.uid(), id) OR (created_by = auth.uid())));


--
-- Name: department_activities Users can view department activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view department activities" ON public.department_activities FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.departments d
  WHERE ((d.id = department_activities.department_id) AND public.user_belongs_to_company(auth.uid(), d.company_id)))));


--
-- Name: department_activity_assignees Users can view department activity assignees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view department activity assignees" ON public.department_activity_assignees FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.department_activities da
     JOIN public.departments d ON ((d.id = da.department_id)))
  WHERE ((da.id = department_activity_assignees.activity_id) AND public.user_belongs_to_company(auth.uid(), d.company_id)))));


--
-- Name: user_departments Users can view department memberships of their companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view department memberships of their companies" ON public.user_departments FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.departments d
  WHERE ((d.id = user_departments.department_id) AND public.user_belongs_to_company(auth.uid(), d.company_id))))));


--
-- Name: departments Users can view departments of their companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view departments of their companies" ON public.departments FOR SELECT TO authenticated USING (public.user_belongs_to_company(auth.uid(), company_id));


--
-- Name: profiles Users can view profiles in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view profiles in their company" ON public.profiles FOR SELECT USING (((id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM (public.user_companies uc1
     JOIN public.user_companies uc2 ON ((uc1.company_id = uc2.company_id)))
  WHERE ((uc1.user_id = auth.uid()) AND (uc2.user_id = profiles.id))))));


--
-- Name: project_activities Users can view project activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view project activities" ON public.project_activities FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_activities.project_id) AND public.user_belongs_to_company(auth.uid(), p.company_id)))));


--
-- Name: project_activity_assignees Users can view project activity assignees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view project activity assignees" ON public.project_activity_assignees FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.project_activities pa
     JOIN public.projects p ON ((p.id = pa.project_id)))
  WHERE ((pa.id = project_activity_assignees.activity_id) AND public.user_belongs_to_company(auth.uid(), p.company_id)))));


--
-- Name: projects Users can view projects of their companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view projects of their companies" ON public.projects FOR SELECT TO authenticated USING (public.user_belongs_to_company(auth.uid(), company_id));


--
-- Name: user_companies Users can view their company memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their company memberships" ON public.user_companies FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id)));


--
-- Name: notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: companies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

--
-- Name: department_activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.department_activities ENABLE ROW LEVEL SECURITY;

--
-- Name: department_activity_assignees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.department_activity_assignees ENABLE ROW LEVEL SECURITY;

--
-- Name: departments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: project_activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_activities ENABLE ROW LEVEL SECURITY;

--
-- Name: project_activity_assignees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_activity_assignees ENABLE ROW LEVEL SECURITY;

--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: user_companies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;

--
-- Name: user_departments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_departments ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


