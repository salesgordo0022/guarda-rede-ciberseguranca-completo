import { supabase } from "@/integrations/supabase/client";
import { createDeadlineApproachingNotification } from "@/utils/notificationUtils";

/**
 * Checks for upcoming deadlines and creates notifications
 */
export async function checkUpcomingDeadlines() {
  try {
    // Get activities with deadlines in the next 24 hours that haven't been notified yet
    const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    const { data: activities, error } = await supabase
      .from('project_activities')
      .select('*')
      .lte('deadline', oneDayFromNow)
      .gte('deadline', new Date().toISOString())
      .neq('status', 'Feito'); // Don't notify for completed tasks

    if (error) {
      console.error("Error fetching activities for deadline check:", error);
      return;
    }

    // Create notifications for each activity
    for (const activity of activities) {
      // Check if we've already created a notification for this activity
      const { data: existingNotifications, error: notificationError } = await supabase
        .from('notifications')
        .select('id')
        .eq('task_id', activity.id)
        .eq('type', 'deadline_approaching');

      if (notificationError) {
        console.error("Error checking existing notifications:", notificationError);
        continue;
      }

      // Only create notification if one doesn't already exist
      if (!existingNotifications || existingNotifications.length === 0) {
        await createDeadlineApproachingNotification(activity, 'system');
      }
    }
  } catch (error) {
    console.error("Error in deadline monitoring:", error);
  }
}

/**
 * Starts the deadline monitoring interval
 */
export function startDeadlineMonitoring() {
  // Check for deadlines every hour
  setInterval(checkUpcomingDeadlines, 60 * 60 * 1000);
  
  // Also check immediately when starting
  checkUpcomingDeadlines();
}