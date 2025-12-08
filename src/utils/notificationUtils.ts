import { supabase } from "@/integrations/supabase/client";

interface ProjectActivity {
  id: string;
  title: string;
  description?: string | null;
  responsible?: string | null;
  department_ids?: string[] | null;
  status: string;
  priority: string;
  deadline?: string | null;
  schedule_start?: string | null;
  schedule_end?: string | null;
  schedule_status?: string | null;
  completed_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  project_id?: string | null;
}

export type NotificationType = 
  | "task_created" 
  | "task_completed" 
  | "task_assigned" 
  | "deadline_approaching" 
  | "comment_added";

export interface CreateNotificationParams {
  title: string;
  description: string;
  type: NotificationType;
  created_by: string;
  created_for: string;
  task_id?: string;
  project_id?: string;
}

/**
 * Creates a notification in the database
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        title: params.title,
        description: params.description,
        type: params.type,
        created_by: params.created_by,
        created_for: params.created_for,
        task_id: params.task_id,
        project_id: params.project_id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating notification:", error);
      return { error };
    }

    return { data };
  } catch (error) {
    console.error("Unexpected error creating notification:", error);
    return { error };
  }
}

/**
 * Creates a notification when a project activity is created
 */
export async function createActivityCreatedNotification(
  activity: ProjectActivity,
  creatorId: string
) {
  // Notify the responsible person if assigned
  if (activity.responsible && activity.responsible !== creatorId) {
    await createNotification({
      title: "Nova atividade atribuída",
      description: `Você recebeu uma nova atividade: "${activity.title}"`,
      type: "task_assigned",
      created_by: creatorId,
      created_for: activity.responsible,
      task_id: activity.id,
      project_id: activity.project_id,
    });
  }

  // Notify all department members if departments are assigned
  if (activity.department_ids && activity.department_ids.length > 0) {
    // In a real implementation, we would notify all department members
    // For now, we'll just log this for demonstration
    console.log("Would notify department members:", activity.department_ids);
  }
}

/**
 * Creates a notification when a project activity is completed
 */
export async function createActivityCompletedNotification(
  activity: ProjectActivity,
  completerId: string
) {
  // Notify the creator of the activity
  if (activity.created_by && activity.created_by !== completerId) {
    await createNotification({
      title: "Atividade concluída",
      description: `A atividade "${activity.title}" foi marcada como concluída`,
      type: "task_completed",
      created_by: completerId,
      created_for: activity.created_by,
      task_id: activity.id,
      project_id: activity.project_id,
    });
  }

  // Notify the responsible person if different from completer
  if (activity.responsible && activity.responsible !== completerId && activity.responsible !== activity.created_by) {
    await createNotification({
      title: "Atividade concluída",
      description: `A atividade "${activity.title}" foi marcada como concluída`,
      type: "task_completed",
      created_by: completerId,
      created_for: activity.responsible,
      task_id: activity.id,
      project_id: activity.project_id,
    });
  }
}

/**
 * Creates a notification when a project activity is assigned
 */
export async function createActivityAssignedNotification(
  activity: ProjectActivity,
  assignerId: string
) {
  // Notify the newly assigned person
  if (activity.responsible && activity.responsible !== assignerId) {
    await createNotification({
      title: "Atividade atribuída",
      description: `A atividade "${activity.title}" foi atribuída a você`,
      type: "task_assigned",
      created_by: assignerId,
      created_for: activity.responsible,
      task_id: activity.id,
      project_id: activity.project_id,
    });
  }
}

/**
 * Creates a notification when a deadline is approaching
 */
export async function createDeadlineApproachingNotification(
  activity: ProjectActivity,
  notifierId: string
) {
  // Notify the responsible person
  if (activity.responsible) {
    await createNotification({
      title: "Prazo se aproximando",
      description: `A atividade "${activity.title}" vence em breve`,
      type: "deadline_approaching",
      created_by: notifierId,
      created_for: activity.responsible,
      task_id: activity.id,
      project_id: activity.project_id,
    });
  }

  // Notify the creator if different from responsible
  if (activity.created_by && activity.created_by !== activity.responsible) {
    await createNotification({
      title: "Prazo se aproximando",
      description: `A atividade "${activity.title}" vence em breve`,
      type: "deadline_approaching",
      created_by: notifierId,
      created_for: activity.created_by,
      task_id: activity.id,
      project_id: activity.project_id,
    });
  }
}