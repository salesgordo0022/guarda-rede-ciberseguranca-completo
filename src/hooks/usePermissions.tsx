import { useAuth } from './useAuth';

export type Permission =
    | 'view_all_tasks'
    | 'view_department_tasks'
    | 'view_assigned_tasks'
    | 'create_task'
    | 'edit_all_tasks'
    | 'edit_department_tasks'
    | 'edit_assigned_tasks'
    | 'delete_all_tasks'
    | 'delete_own_tasks'
    | 'delegate_task'
    | 'delegate_department_task'
    | 'filter_by_department'
    | 'view_all_reports'
    | 'view_department_reports'
    | 'view_own_reports'
    | 'export_reports'
    | 'manage_users';

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    admin: [
        'view_all_tasks',
        'create_task',
        'edit_all_tasks',
        'delete_all_tasks',
        'delegate_task',
        'filter_by_department',
        'view_all_reports',
        'export_reports',
        'manage_users',
    ],
    gestor: [
        'view_department_tasks',
        'create_task',
        'edit_department_tasks',
        'delete_own_tasks',
        'delegate_department_task',
        'view_department_reports',
        'export_reports',
    ],
    colaborador: [
        'view_assigned_tasks',
        'edit_assigned_tasks',
        'view_own_reports',
    ],
};

export function usePermissions() {
    const { profile, isAdmin, isGestor, isColaborador } = useAuth();

    const hasPermission = (permission: Permission): boolean => {
        if (!profile) return false;

        const rolePermissions = ROLE_PERMISSIONS[profile.role] || [];
        return rolePermissions.includes(permission);
    };

    const hasAnyPermission = (permissions: Permission[]): boolean => {
        return permissions.some(permission => hasPermission(permission));
    };

    const hasAllPermissions = (permissions: Permission[]): boolean => {
        return permissions.every(permission => hasPermission(permission));
    };

    const canViewTask = (task: {
        department_id?: string | null;
        assigned_to?: string | null;
    }): boolean => {
        if (!profile) return false;

        // Admin vê tudo
        if (isAdmin) return true;

        // Gestor vê tarefas do departamento
        if (isGestor) {
            return task.department_id === profile.department_id ||
                task.department_id === null;
        }

        // Colaborador vê apenas tarefas atribuídas
        if (isColaborador) {
            return task.assigned_to === profile.id;
        }

        return false;
    };

    const canEditTask = (task: {
        department_id?: string | null;
        assigned_to?: string | null;
        created_by?: string | null;
    }): boolean => {
        if (!profile) return false;

        // Admin pode editar tudo
        if (isAdmin) return true;

        // Gestor pode editar tarefas do departamento ou criadas por ele
        if (isGestor) {
            return task.department_id === profile.department_id ||
                task.created_by === profile.id;
        }

        // Colaborador pode editar apenas status de tarefas atribuídas
        if (isColaborador) {
            return task.assigned_to === profile.id;
        }

        return false;
    };

    const canDeleteTask = (task: { created_by?: string | null }): boolean => {
        if (!profile) return false;

        // Admin pode deletar tudo
        if (isAdmin) return true;

        // Gestor pode deletar apenas tarefas criadas por ele
        if (isGestor) {
            return task.created_by === profile.id;
        }

        // Colaborador não pode deletar
        return false;
    };

    const canDelegateTask = (task: {
        department_id?: string | null;
    }, targetUserId: string): boolean => {
        if (!profile) return false;

        // Admin pode delegar para qualquer um
        if (isAdmin) return true;

        // Gestor pode delegar apenas para usuários do mesmo departamento
        if (isGestor) {
            return task.department_id === profile.department_id;
        }

        // Colaborador não pode delegar
        return false;
    };

    return {
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        canViewTask,
        canEditTask,
        canDeleteTask,
        canDelegateTask,
        isAdmin,
        isGestor,
        isColaborador,
    };
}
