/**
 * Notification Service
 * Centralizes notification creation for all system events
 */

import { supabase } from "@/integrations/supabase/client";

export type NotificationType = 
  | "assignment" 
  | "mention" 
  | "deadline" 
  | "status_change"
  | "activity_created"
  | "activity_updated"
  | "activity_completed"
  | "activity_canceled"
  | "project_created"
  | "project_updated"
  | "comment_added";

interface NotificationParams {
  title: string;
  description?: string;
  type: NotificationType;
  activityId?: string;
  projectId?: string;
  departmentId?: string;
  createdBy: string;
}

/**
 * Gets all user IDs from a company
 */
async function getCompanyUserIds(companyId: string): Promise<string[]> {
  const { data } = await supabase
    .from("user_companies")
    .select("user_id")
    .eq("company_id", companyId);
  
  return (data || []).map(uc => uc.user_id);
}

/**
 * Creates notifications for all users in a company
 */
export async function notifyCompanyUsers(
  companyId: string,
  params: NotificationParams
) {
  try {
    const userIds = await getCompanyUserIds(companyId);
    
    if (userIds.length === 0) return;

    const notifications = userIds.map(userId => ({
      user_id: userId,
      title: params.title,
      description: params.description || null,
      type: params.type,
      activity_id: params.activityId || null,
      project_id: params.projectId || null,
      department_id: params.departmentId || null,
      created_by: params.createdBy,
    }));

    const { error } = await supabase.from("notifications").insert(notifications);
    
    if (error) {
      console.error("Error creating notifications:", error);
    }
  } catch (e) {
    console.error("Error in notifyCompanyUsers:", e);
  }
}

/**
 * Creates a notification for a single user
 */
export async function notifyUser(
  userId: string,
  params: NotificationParams
) {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
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
    }
  } catch (e) {
    console.error("Error in notifyUser:", e);
  }
}

// ========== Department Activity Notifications ==========

export async function notifyActivityCreated(
  companyId: string,
  activityName: string,
  departmentName: string,
  departmentId: string,
  activityId: string,
  creatorName: string,
  createdBy: string
) {
  await notifyCompanyUsers(companyId, {
    title: "Nova atividade criada",
    description: `${creatorName} criou "${activityName}" no departamento ${departmentName}`,
    type: "activity_created",
    activityId,
    departmentId,
    createdBy,
  });
}

export async function notifyActivityStatusChanged(
  companyId: string,
  activityName: string,
  oldStatus: string,
  newStatus: string,
  activityId: string,
  departmentId: string,
  changerName: string,
  createdBy: string
) {
  const statusLabels: Record<string, string> = {
    'pendente': 'Não iniciado',
    'em_andamento': 'Em andamento',
    'concluida': 'Finalizado',
    'cancelada': 'Cancelado'
  };

  await notifyCompanyUsers(companyId, {
    title: newStatus === 'concluida' ? "Atividade concluída" : "Status alterado",
    description: `${changerName} alterou "${activityName}" de ${statusLabels[oldStatus] || oldStatus} para ${statusLabels[newStatus] || newStatus}`,
    type: newStatus === 'concluida' ? "activity_completed" : "status_change",
    activityId,
    departmentId,
    createdBy,
  });
}

export async function notifyActivityUpdated(
  companyId: string,
  activityName: string,
  activityId: string,
  departmentId: string,
  updaterName: string,
  createdBy: string
) {
  await notifyCompanyUsers(companyId, {
    title: "Atividade atualizada",
    description: `${updaterName} atualizou "${activityName}"`,
    type: "activity_updated",
    activityId,
    departmentId,
    createdBy,
  });
}

// ========== Project Activity Notifications ==========

export async function notifyProjectActivityCreated(
  companyId: string,
  activityName: string,
  projectName: string,
  projectId: string,
  activityId: string,
  creatorName: string,
  createdBy: string
) {
  await notifyCompanyUsers(companyId, {
    title: "Nova atividade de projeto",
    description: `${creatorName} criou "${activityName}" no projeto ${projectName}`,
    type: "activity_created",
    activityId,
    projectId,
    createdBy,
  });
}

export async function notifyProjectActivityCompleted(
  companyId: string,
  activityName: string,
  projectName: string,
  projectId: string,
  activityId: string,
  completerName: string,
  createdBy: string
) {
  await notifyCompanyUsers(companyId, {
    title: "Atividade de projeto concluída",
    description: `${completerName} concluiu "${activityName}" no projeto ${projectName}`,
    type: "activity_completed",
    activityId,
    projectId,
    createdBy,
  });
}

// ========== Project Notifications ==========

export async function notifyProjectCreated(
  companyId: string,
  projectName: string,
  projectId: string,
  creatorName: string,
  createdBy: string
) {
  await notifyCompanyUsers(companyId, {
    title: "Novo projeto criado",
    description: `${creatorName} criou o projeto "${projectName}"`,
    type: "project_created",
    projectId,
    createdBy,
  });
}

export async function notifyProjectUpdated(
  companyId: string,
  projectName: string,
  projectId: string,
  updaterName: string,
  createdBy: string
) {
  await notifyCompanyUsers(companyId, {
    title: "Projeto atualizado",
    description: `${updaterName} atualizou o projeto "${projectName}"`,
    type: "project_updated",
    projectId,
    createdBy,
  });
}

// ========== Comment Notifications ==========

export async function notifyCommentAdded(
  companyId: string,
  activityName: string,
  activityId: string,
  departmentId: string | undefined,
  projectId: string | undefined,
  commenterName: string,
  createdBy: string
) {
  await notifyCompanyUsers(companyId, {
    title: "Novo comentário",
    description: `${commenterName} comentou em "${activityName}"`,
    type: "comment_added",
    activityId,
    departmentId,
    projectId,
    createdBy,
  });
}
