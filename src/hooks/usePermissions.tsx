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
    | 'manage_users'
    | 'manage_companies'
    | 'manage_departments'
    | 'access_all_companies'
    | 'access_all_departments';

/**
 * MODELO DE PERMISSÕES:
 * 
 * ADMIN (Global):
 * - Acesso TOTAL ao sistema
 * - Pode acessar, criar, editar, excluir QUALQUER elemento
 * - Pode gerenciar usuários, empresas, departamentos
 * - Sem NENHUMA restrição
 * 
 * GESTOR:
 * - Pode acessar TODOS os departamentos e empresas
 * - Pode criar, editar, gerenciar, concluir e excluir atividades em qualquer lugar
 * - NÃO tem acesso a configurações globais (gerenciamento de usuários/empresas)
 * 
 * COLABORADOR:
 * - Só acessa departamentos/empresas aos quais está ATRIBUÍDO
 * - Dentro dos seus departamentos: pode criar, editar, gerenciar, concluir, excluir atividades
 * - Não acessa outros departamentos/empresas
 */

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    admin: [
        // Acesso total a tudo
        'view_all_tasks',
        'view_department_tasks',
        'view_assigned_tasks',
        'create_task',
        'edit_all_tasks',
        'edit_department_tasks',
        'edit_assigned_tasks',
        'delete_all_tasks',
        'delete_own_tasks',
        'delegate_task',
        'delegate_department_task',
        'filter_by_department',
        'view_all_reports',
        'view_department_reports',
        'view_own_reports',
        'export_reports',
        'manage_users',
        'manage_companies',
        'manage_departments',
        'access_all_companies',
        'access_all_departments',
    ],
    gestor: [
        // Acesso a todos os departamentos/empresas para atividades
        'view_all_tasks',
        'view_department_tasks',
        'view_assigned_tasks',
        'create_task',
        'edit_all_tasks',
        'edit_department_tasks',
        'edit_assigned_tasks',
        'delete_all_tasks',
        'delete_own_tasks',
        'delegate_task',
        'delegate_department_task',
        'filter_by_department',
        'view_all_reports',
        'view_department_reports',
        'view_own_reports',
        'export_reports',
        'access_all_companies',
        'access_all_departments',
        // NÃO tem: manage_users, manage_companies, manage_departments
    ],
    colaborador: [
        // Apenas seus departamentos atribuídos
        'view_assigned_tasks',
        'view_department_tasks',
        'create_task',
        'edit_assigned_tasks',
        'edit_department_tasks',
        'delete_own_tasks',
        'view_own_reports',
        'view_department_reports',
        // NÃO tem: access_all_companies, access_all_departments
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

    /**
     * Verifica se o usuário pode visualizar uma tarefa/atividade
     */
    const canViewTask = (task: {
        department_id?: string | null;
        assigned_to?: string | null;
    }): boolean => {
        if (!profile) return false;

        // Admin e Gestor veem TUDO
        if (isAdmin || isGestor) return true;

        // Colaborador vê tarefas do seu departamento ou atribuídas a ele
        if (isColaborador) {
            const isInMyDepartment = task.department_id === profile.department_id;
            const isAssignedToMe = task.assigned_to === profile.id;
            return isInMyDepartment || isAssignedToMe;
        }

        return false;
    };

    /**
     * Verifica se o usuário pode editar uma tarefa/atividade
     */
    const canEditTask = (task: {
        department_id?: string | null;
        assigned_to?: string | null;
        created_by?: string | null;
    }): boolean => {
        if (!profile) return false;

        // Admin e Gestor podem editar TUDO
        if (isAdmin || isGestor) return true;

        // Colaborador pode editar tarefas do seu departamento ou atribuídas a ele
        if (isColaborador) {
            const isInMyDepartment = task.department_id === profile.department_id;
            const isAssignedToMe = task.assigned_to === profile.id;
            const isCreatedByMe = task.created_by === profile.id;
            return isInMyDepartment || isAssignedToMe || isCreatedByMe;
        }

        return false;
    };

    /**
     * Verifica se o usuário pode excluir uma tarefa/atividade
     */
    const canDeleteTask = (task: { 
        created_by?: string | null;
        department_id?: string | null;
    }): boolean => {
        if (!profile) return false;

        // Admin e Gestor podem deletar TUDO
        if (isAdmin || isGestor) return true;

        // Colaborador pode deletar tarefas que criou ou do seu departamento
        if (isColaborador) {
            const isCreatedByMe = task.created_by === profile.id;
            const isInMyDepartment = task.department_id === profile.department_id;
            return isCreatedByMe || isInMyDepartment;
        }

        return false;
    };

    /**
     * Verifica se o usuário pode delegar uma tarefa
     */
    const canDelegateTask = (task: {
        department_id?: string | null;
    }, targetUserId: string): boolean => {
        if (!profile) return false;

        // Admin e Gestor podem delegar para qualquer um
        if (isAdmin || isGestor) return true;

        // Colaborador não pode delegar
        return false;
    };

    /**
     * Verifica se o usuário pode acessar um departamento específico
     */
    const canAccessDepartment = (departmentId: string): boolean => {
        if (!profile) return false;

        // Admin e Gestor acessam todos os departamentos
        if (isAdmin || isGestor) return true;

        // Colaborador só acessa seu departamento
        return departmentId === profile.department_id;
    };

    /**
     * Verifica se o usuário pode gerenciar configurações
     */
    const canManageSettings = (): boolean => {
        return isAdmin;
    };

    /**
     * Verifica se o usuário pode gerenciar usuários
     */
    const canManageUsers = (): boolean => {
        return isAdmin;
    };

    return {
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        canViewTask,
        canEditTask,
        canDeleteTask,
        canDelegateTask,
        canAccessDepartment,
        canManageSettings,
        canManageUsers,
        isAdmin,
        isGestor,
        isColaborador,
    };
}
