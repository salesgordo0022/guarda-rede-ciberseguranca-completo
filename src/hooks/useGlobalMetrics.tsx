import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UnifiedActivity {
  id: string;
  name: string;
  status: string;
  deadline: string | null;
  deadline_status: string | null;
  priority: string | null;
  description: string | null;
  type: 'project' | 'department';
  source_name: string;
  source_id: string;
}

export interface GlobalMetrics {
  total: number;
  completed: number;
  in_progress: number;
  pending: number;
  overdue: number;
}

export function useGlobalMetrics() {
  const { selectedCompanyId, profile } = useAuth();

  // Buscar todas as atividades (projetos + departamentos)
  const { data, isLoading } = useQuery({
    queryKey: ['global-activities', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return { activities: [], metrics: null };

      // Buscar atividades de projetos (filtrando por empresa no backend)
      const { data: projectActivities, error: paError } = await supabase
        .from('project_activities')
        .select(
          `
          id, name, status, deadline, deadline_status, description,
          project:projects!inner(id, name, company_id)
        `
        )
        .eq('project.company_id', selectedCompanyId);

      if (paError) throw paError;

      // Buscar atividades de departamentos (filtrando por empresa no backend)
      const { data: deptActivities, error: daError } = await supabase
        .from('department_activities')
        .select(
          `
          id, name, status, deadline, deadline_status, priority, description,
          department:departments!inner(id, name, company_id)
        `
        )
        .eq('department.company_id', selectedCompanyId);

      if (daError) throw daError;

      // Unificar
      const projectUnified = (projectActivities || []).map((a: any): UnifiedActivity => ({
        id: a.id,
        name: a.name,
        status: a.status ?? 'pendente',
        deadline: a.deadline,
        deadline_status: a.deadline_status,
        priority: null, // project_activities não tem coluna priority
        description: a.description,
        type: 'project',
        source_name: a.project?.name || 'Sem projeto',
        source_id: a.project?.id || '',
      }));

      const deptUnified = (deptActivities || []).map((a: any): UnifiedActivity => ({
        id: a.id,
        name: a.name,
        status: a.status ?? 'pendente',
        deadline: a.deadline,
        deadline_status: a.deadline_status,
        priority: a.priority,
        description: a.description,
        type: 'department',
        source_name: a.department?.name || 'Sem departamento',
        source_id: a.department?.id || '',
      }));

      const allActivities = [...projectUnified, ...deptUnified];

      const metrics: GlobalMetrics = {
        total: allActivities.length,
        completed: allActivities.filter(a => a.status === 'concluida').length,
        in_progress: allActivities.filter(a => a.status === 'em_andamento').length,
        pending: allActivities.filter(a => a.status === 'pendente').length,
        overdue: allActivities.filter(a => a.deadline_status === 'fora_do_prazo').length,
      };

      return { activities: allActivities, metrics };
    },
    enabled: !!selectedCompanyId && !!profile,
    staleTime: 1000 * 60 * 2, // 2 minutos
    refetchOnMount: true,
  });

  return {
    activities: data?.activities || [],
    metrics: data?.metrics || null,
    isLoading,
  };
}
