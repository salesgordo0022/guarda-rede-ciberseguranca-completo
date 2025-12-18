/**
 * Notification utilities
 * Functions to create notifications for various events
 */

import { supabase } from "@/integrations/supabase/client";

export type NotificationType = 
  | "assignment" 
  | "mention" 
  | "deadline" 
  | "status_change";

export interface CreateNotificationParams {
  userId: string;
  title: string;
  description?: string;
  type: NotificationType;
  activityId?: string;
  projectId?: string;
  departmentId?: string;
  createdBy: string;
}

/**
 * Creates a notification in the database
 */
export async function createNotification(params: CreateNotificationParams) {
  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    title: params.title,
    description: params.description || null,
    type: params.type,
    activity_id: params.activityId || null,
    project_id: params.projectId || null,
    department_id: params.departmentId || null,
    created_by: params.createdBy,
  });

  if (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
  
  return { success: true };
}

/**
 * Creates notifications for all assignees of an activity
 */
export async function notifyActivityAssignees(
  activityId: string,
  activityName: string,
  title: string,
  description: string,
  type: NotificationType,
  createdBy: string,
  isProject: boolean = false,
  departmentId?: string
) {
  const table = isProject ? 'project_activity_assignees' : 'department_activity_assignees';
  
  const { data: assignees, error: fetchError } = await supabase
    .from(table)
    .select('user_id')
    .eq('activity_id', activityId);

  if (fetchError) {
    console.error("Error fetching assignees:", fetchError);
    return;
  }

  if (!assignees || assignees.length === 0) return;

  for (const assignee of assignees) {
    if (assignee.user_id !== createdBy) {
      try {
        await createNotification({
          userId: assignee.user_id,
          title,
          description,
          type,
          activityId,
          departmentId,
          createdBy
        });
      } catch (e) {
        console.error("Error creating notification for assignee:", e);
      }
    }
  }
}

/**
 * Creates a notification when a user is assigned to an activity
 */
export async function createAssignmentNotification(
  assignedUserId: string,
  activityId: string,
  activityName: string,
  assignerName: string,
  assignerId: string,
  departmentId?: string
) {
  return createNotification({
    userId: assignedUserId,
    title: "Você foi atribuído a uma atividade",
    description: `${assignerName} atribuiu você à atividade "${activityName}"`,
    type: "assignment",
    activityId,
    departmentId,
    createdBy: assignerId
  });
}

/**
 * Creates notifications for deadline approaching
 * Should be called by a scheduled job or cron
 */
export async function checkAndNotifyDeadlines(userId: string) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Check department activities
  const { data: deptActivities } = await supabase
    .from('department_activities')
    .select(`
      id,
      name,
      deadline,
      department_id,
      department_activity_assignees (user_id)
    `)
    .eq('deadline', tomorrowStr)
    .neq('status', 'concluida')
    .neq('status', 'cancelada');

  if (deptActivities) {
    for (const activity of deptActivities) {
      const assignees = activity.department_activity_assignees as { user_id: string }[];
      for (const assignee of assignees) {
        try {
          await createNotification({
            userId: assignee.user_id,
            title: "Prazo se aproxima!",
            description: `A atividade "${activity.name}" vence amanhã`,
            type: "deadline",
            activityId: activity.id,
            departmentId: activity.department_id,
            createdBy: userId
          });
        } catch (e) {
          console.error("Error creating deadline notification:", e);
        }
      }
    }
  }

  // Check project activities
  const { data: projActivities } = await supabase
    .from('project_activities')
    .select(`
      id,
      name,
      deadline,
      project_id,
      project_activity_assignees (user_id)
    `)
    .eq('deadline', tomorrowStr)
    .neq('status', 'concluida')
    .neq('status', 'cancelada');

  if (projActivities) {
    for (const activity of projActivities) {
      const assignees = activity.project_activity_assignees as { user_id: string }[];
      for (const assignee of assignees) {
        try {
          await createNotification({
            userId: assignee.user_id,
            title: "Prazo se aproxima!",
            description: `A atividade "${activity.name}" vence amanhã`,
            type: "deadline",
            activityId: activity.id,
            projectId: activity.project_id,
            createdBy: userId
          });
        } catch (e) {
          console.error("Error creating deadline notification:", e);
        }
      }
    }
  }
}
