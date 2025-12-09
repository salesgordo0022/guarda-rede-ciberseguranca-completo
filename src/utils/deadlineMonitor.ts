import { supabase } from "@/integrations/supabase/client";

/**
 * Checks for upcoming deadlines and logs them
 * Note: Notifications table doesn't exist, so we just log for now
 */
export async function checkUpcomingDeadlines() {
  try {
    // Get activities with deadlines in the next 24 hours
    const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    const { data: activities, error } = await supabase
      .from('project_activities')
      .select('*')
      .lte('deadline', oneDayFromNow)
      .gte('deadline', new Date().toISOString())
      .neq('status', 'concluida');

    if (error) {
      console.error("Error fetching activities for deadline check:", error);
      return;
    }

    if (activities && activities.length > 0) {
      console.log(`Found ${activities.length} activities with approaching deadlines`);
      // In a real implementation, you would create notifications here
      // For now, just log the activities
      activities.forEach(activity => {
        console.log(`Deadline approaching for activity: ${activity.name} (deadline: ${activity.deadline})`);
      });
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
