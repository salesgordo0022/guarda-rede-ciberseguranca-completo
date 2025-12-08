import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskFilters, TaskWithRelations, TaskMetrics } from '@/types/task';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export function useTasks(filters?: TaskFilters) {
    const { profile } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Buscar tarefas com filtros
    const { data: tasks, isLoading, error, refetch } = useQuery({
        queryKey: ['tasks', filters, profile?.id],
        queryFn: async () => {
            let query = supabase
                .from('tasks')
                .select(`
          *,
          department:departments(id, name),
          assigned_user:profiles!tasks_assigned_to_fkey(id, full_name),
          creator:profiles!tasks_created_by_fkey(id, full_name)
        `)
                .order('created_at', { ascending: false });

            // Aplicar filtros
            if (filters?.status && filters.status.length > 0) {
                query = query.in('status', filters.status);
            }

            if (filters?.priority && filters.priority.length > 0) {
                query = query.in('priority', filters.priority);
            }

            if (filters?.department_id) {
                query = query.eq('department_id', filters.department_id);
            }

            if (filters?.assigned_to) {
                query = query.eq('assigned_to', filters.assigned_to);
            }

            if (filters?.created_by) {
                query = query.eq('created_by', filters.created_by);
            }

            if (filters?.date_from) {
                query = query.gte('deadline', filters.date_from);
            }

            if (filters?.date_to) {
                query = query.lte('deadline', filters.date_to);
            }

            if (filters?.has_fine !== undefined) {
                query = query.eq('has_fine', filters.has_fine);
            }

            if (filters?.search) {
                query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data as TaskWithRelations[];
        },
        enabled: !!profile,
    });

    // Buscar métricas
    const { data: metrics } = useQuery({
        queryKey: ['task-metrics', profile?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tasks')
                .select('status, has_fine, fine_amount, deadline, schedule_status');

            if (error) throw error;

            const today = new Date().toISOString().split('T')[0];

            const metrics: TaskMetrics = {
                total: data.length,
                completed: data.filter(t => t.status === 'Feito').length,
                in_progress: data.filter(t => t.status === 'Em andamento').length,
                not_started: data.filter(t => t.status === 'Não iniciado').length,
                stopped: data.filter(t => t.status === 'Parado').length,
                overdue: data.filter(t => t.schedule_status === 'Atrasado').length,
                due_today: data.filter(t => t.deadline === today).length,
                with_fine: data.filter(t => t.has_fine).length,
                total_fine_amount: data
                    .filter(t => t.has_fine && t.fine_amount)
                    .reduce((sum, t) => sum + (t.fine_amount || 0), 0),
            };

            return metrics;
        },
        enabled: !!profile,
    });

    // Criar tarefa
    const createTask = useMutation({
        mutationFn: async (task: Partial<Task>) => {
            const { data, error } = await supabase
                .from('tasks')
                .insert({
                    ...task,
                    created_by: profile?.id,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['task-metrics'] });
            toast({
                title: 'Tarefa criada',
                description: 'A tarefa foi criada com sucesso.',
            });
        },
        onError: (error) => {
            toast({
                title: 'Erro ao criar tarefa',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Atualizar tarefa
    const updateTask = useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
            const { data, error } = await supabase
                .from('tasks')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['task-metrics'] });
            toast({
                title: 'Tarefa atualizada',
                description: 'A tarefa foi atualizada com sucesso.',
            });
        },
        onError: (error) => {
            toast({
                title: 'Erro ao atualizar tarefa',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Deletar tarefa
    const deleteTask = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['task-metrics'] });
            toast({
                title: 'Tarefa deletada',
                description: 'A tarefa foi deletada com sucesso.',
            });
        },
        onError: (error) => {
            toast({
                title: 'Erro ao deletar tarefa',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Marcar como concluída
    const completeTask = useMutation({
        mutationFn: async (id: string) => {
            const { data, error } = await supabase
                .from('tasks')
                .update({
                    status: 'Feito',
                    completed_at: new Date().toISOString(),
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['task-metrics'] });
            toast({
                title: 'Tarefa concluída',
                description: 'A tarefa foi marcada como concluída.',
            });
        },
        onError: (error) => {
            toast({
                title: 'Erro ao concluir tarefa',
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
