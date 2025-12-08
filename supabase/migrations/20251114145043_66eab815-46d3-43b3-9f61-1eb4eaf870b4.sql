-- Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create profiles table for users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create activities table
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  cancellation_type TEXT,
  requires_justification BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sub_activities table
CREATE TABLE IF NOT EXISTS public.sub_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create processes table
CREATE TABLE IF NOT EXISTS public.processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  reference_date DATE,
  deadline_days INTEGER DEFAULT 0,
  email_notification BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create process_activities table (activities in a process)
CREATE TABLE IF NOT EXISTS public.process_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID REFERENCES public.processes(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(process_id, activity_id)
);

-- Create workflows table
CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create workflow_processes table (processes in a workflow)
CREATE TABLE IF NOT EXISTS public.workflow_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
  process_id UUID REFERENCES public.processes(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(workflow_id, process_id)
);

-- Create activity_completions table (track user completions)
CREATE TABLE IF NOT EXISTS public.activity_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  process_activity_id UUID REFERENCES public.process_activities(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(activity_id, user_id, process_activity_id)
);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for departments
CREATE POLICY "Users can view all departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL TO authenticated USING (true);

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- RLS Policies for activities
CREATE POLICY "Users can view activities from their department" ON public.activities 
  FOR SELECT TO authenticated 
  USING (department_id IN (SELECT department_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can create activities" ON public.activities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update activities" ON public.activities FOR UPDATE TO authenticated USING (true);

-- RLS Policies for sub_activities
CREATE POLICY "Users can view sub_activities" ON public.sub_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage sub_activities" ON public.sub_activities FOR ALL TO authenticated USING (true);

-- RLS Policies for processes
CREATE POLICY "Users can view all processes" ON public.processes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create processes" ON public.processes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update processes" ON public.processes FOR UPDATE TO authenticated USING (true);

-- RLS Policies for process_activities
CREATE POLICY "Users can view process_activities" ON public.process_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage process_activities" ON public.process_activities FOR ALL TO authenticated USING (true);

-- RLS Policies for workflows
CREATE POLICY "Users can view all workflows" ON public.workflows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create workflows" ON public.workflows FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update workflows" ON public.workflows FOR UPDATE TO authenticated USING (true);

-- RLS Policies for workflow_processes
CREATE POLICY "Users can view workflow_processes" ON public.workflow_processes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage workflow_processes" ON public.workflow_processes FOR ALL TO authenticated USING (true);

-- RLS Policies for activity_completions
CREATE POLICY "Users can view their completions" ON public.activity_completions 
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid());
CREATE POLICY "Users can create their completions" ON public.activity_completions 
  FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON public.activities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_processes_updated_at BEFORE UPDATE ON public.processes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON public.workflows
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();