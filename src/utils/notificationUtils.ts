/**
 * Notification utilities
 * Note: The notifications table doesn't exist in the database yet.
 * These functions log notifications instead until the table is created.
 */

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

interface ProjectActivity {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  deadline?: string | null;
  created_by: string;
  project_id: string;
}

/**
 * Creates a notification (logs it since table doesn't exist)
 */
export async function createNotification(params: CreateNotificationParams) {
  console.log("Notification:", params.title, "-", params.description);
  return { data: params, error: null };
}

/**
 * Creates a notification when a project activity is created
 */
export async function createActivityCreatedNotification(
  activity: ProjectActivity,
  creatorId: string
) {
  console.log(`Activity created: ${activity.name} by ${creatorId}`);
}

/**
 * Creates a notification when a project activity is completed
 */
export async function createActivityCompletedNotification(
  activity: ProjectActivity,
  completerId: string
) {
  console.log(`Activity completed: ${activity.name} by ${completerId}`);
}

/**
 * Creates a notification when a project activity is assigned
 */
export async function createActivityAssignedNotification(
  activity: ProjectActivity,
  assignerId: string
) {
  console.log(`Activity assigned: ${activity.name} by ${assignerId}`);
}

/**
 * Creates a notification when a deadline is approaching
 */
export async function createDeadlineApproachingNotification(
  activity: ProjectActivity,
  notifierId: string
) {
  console.log(`Deadline approaching for: ${activity.name}`);
}
