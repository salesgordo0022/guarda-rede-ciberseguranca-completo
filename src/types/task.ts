export type TaskStatus = 'Não iniciado' | 'Em andamento' | 'Parado' | 'Feito';
export type TaskPriority = 'baixa' | 'média' | 'alta' | 'urgente';
export type ScheduleStatus = 'Dentro do prazo' | 'Atrasado';
export type TaskHistoryAction = 'criada' | 'atualizada' | 'concluída' | 'delegada' | 'comentada';

export interface Task {
    id: string;
    title: string;
    description?: string | null;
    responsible?: string | null;
    department_id?: string | null;
    assigned_to?: string | null;
    created_by?: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    deadline?: string | null;
    schedule_start?: string | null;
    schedule_end?: string | null;
    schedule_status?: ScheduleStatus | null;
    has_fine: boolean;
    fine_amount?: number | null;
    fine_reason?: string | null;
    completed_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface TaskHistory {
    id: string;
    task_id: string;
    user_id?: string | null;
    action: TaskHistoryAction;
    old_values?: Record<string, any> | null;
    new_values?: Record<string, any> | null;
    created_at: string;
}

export interface TaskComment {
    id: string;
    task_id: string;
    user_id: string;
    comment: string;
    created_at: string;
}

export interface TaskWithRelations extends Task {
    department?: {
        id: string;
        name: string;
    } | null;
    assigned_user?: {
        id: string;
        full_name: string;
    } | null;
    creator?: {
        id: string;
        full_name: string;
    } | null;
}

export interface TaskFilters {
    status?: TaskStatus[];
    priority?: TaskPriority[];
    department_id?: string;
    assigned_to?: string;
    created_by?: string;
    date_from?: string;
    date_to?: string;
    has_fine?: boolean;
    search?: string;
}

export interface TaskMetrics {
    total: number;
    completed: number;
    in_progress: number;
    not_started: number;
    stopped: number;
    overdue: number;
    due_today: number;
    with_fine: number;
    total_fine_amount: number;
}
