import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

// Tipos baseados na tabela project_activities
export interface ProjectActivity {
    id: string;
    project_id: string;
    name: string;
    description: string | null;
    status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
    deadline: string | null;
    deadline_status: 'no_prazo' | 'fora_do_prazo' | 'concluido_no_prazo' | 'concluido_atrasado' | 'bateu_meta' | null;
    scheduled_date: string | null;
    completed_at: string | null;
    kanban_column: string | null;
    order_index: number | null;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface TaskMetrics {
    total: number;
    completed: number;
    in_progress: number;
    pending: number;
    overdue: number;
}

export function useTasks(projectId?: string) {
    const { profile, selectedCompanyId } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Buscar atividades de projeto
    const { data: tasks, isLoading, error, refetch } = useQuery({
        queryKey: ['project-activities', projectId, selectedCompanyId],
        queryFn: async () => {
            if (!selectedCompanyId) return [];

            let query = supabase
                .from('project_activities')
                .select(`
                    *,
                    project:projects(id, name, company_id)
                `)
                .order('created_at', { ascending: false });

            if (projectId) {
                query = query.eq('project_id', projectId);
            }

            const { data, error } = await query;

            if (error) throw error;
            
            // Filtrar por company_id através do projeto
            return (data || []).filter((activity: any) => 
                activity.project?.company_id === selectedCompanyId
            );
        },
        enabled: !!profile && !!selectedCompanyId,
    });

    // Buscar métricas
    const { data: metrics } = useQuery({
        queryKey: ['task-metrics', selectedCompanyId],
        queryFn: async () => {
            if (!selectedCompanyId) return null;

            const { data, error } = await supabase
                .from('project_activities')
                .select(`
                    status, 
                    deadline_status, 
                    deadline,
                    project:projects(company_id)
                `);

            if (error) throw error;

            // Filtrar por company_id
            const filteredData = (data || []).filter((activity: any) => 
                activity.project?.company_id === selectedCompanyId
            );

            const metrics: TaskMetrics = {
                total: filteredData.length,
                completed: filteredData.filter((t: any) => t.status === 'concluida').length,
                in_progress: filteredData.filter((t: any) => t.status === 'em_andamento').length,
                pending: filteredData.filter((t: any) => t.status === 'pendente').length,
                overdue: filteredData.filter((t: any) => t.deadline_status === 'fora_do_prazo').length,
            };

            return metrics;
        },
        enabled: !!profile && !!selectedCompanyId,
    });

    // Criar atividade
    const createTask = useMutation({
        mutationFn: async (activity: { name: string; project_id: string; description?: string }) => {
            if (!profile?.id) throw new Error('Usuário não autenticado');
            
            const { data, error } = await supabase
                .from('project_activities')
                .insert({
                    name: activity.name,
                    project_id: activity.project_id,
                    description: activity.description || null,
                    created_by: profile.id,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project-activities'] });
            queryClient.invalidateQueries({ queryKey: ['task-metrics'] });
            toast({
                title: 'Atividade criada',
                description: 'A atividade foi criada com sucesso.',
            });
        },
        onError: (error) => {
            toast({
                title: 'Erro ao criar atividade',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Atualizar atividade
    const updateTask = useMutation({
        mutationFn: async ({ id, ...updates }: { id: string; status?: string; name?: string }) => {
            const { data, error } = await supabase
                .from('project_activities')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project-activities'] });
            queryClient.invalidateQueries({ queryKey: ['task-metrics'] });
            toast({
                title: 'Atividade atualizada',
                description: 'A atividade foi atualizada com sucesso.',
            });
        },
        onError: (error) => {
            toast({
                title: 'Erro ao atualizar atividade',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Deletar atividade
    const deleteTask = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('project_activities')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project-activities'] });
            queryClient.invalidateQueries({ queryKey: ['task-metrics'] });
            toast({
                title: 'Atividade deletada',
                description: 'A atividade foi deletada com sucesso.',
            });
        },
        onError: (error) => {
            toast({
                title: 'Erro ao deletar atividade',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Marcar como concluída
    const completeTask = useMutation({
        mutationFn: async (id: string) => {
            const { data, error } = await supabase
                .from('project_activities')
                .update({
                    status: 'concluida',
                    completed_at: new Date().toISOString(),
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project-activities'] });
            queryClient.invalidateQueries({ queryKey: ['task-metrics'] });
            toast({
                title: 'Atividade concluída',
                description: 'A atividade foi marcada como concluída.',
            });
        },
        onError: (error) => {
            toast({
                title: 'Erro ao concluir atividade',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    return {
        tasks,
        metrics,
        isLoading,
        error,
        refetch,
        createTask: createTask.mutate,
        updateTask: updateTask.mutate,
        deleteTask: deleteTask.mutate,
        completeTask: completeTask.mutate,
        isCreating: createTask.isPending,
        isUpdating: updateTask.isPending,
        isDeleting: deleteTask.isPending,
        isCompleting: completeTask.isPending,
    };
}
