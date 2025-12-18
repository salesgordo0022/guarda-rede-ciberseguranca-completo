import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RecurringActivity {
  id: string
  name: string
  description: string | null
  department_id: string
  priority: string | null
  created_by: string
  recurrence_type: 'daily' | 'weekly' | 'monthly'
  recurrence_day: number | null
  last_recurrence_date: string | null
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const dayOfWeek = today.getDay() // 0 = Sunday, 6 = Saturday
    const dayOfMonth = today.getDate()

    console.log(`[process-recurring-activities] Running for date: ${todayStr}, dayOfWeek: ${dayOfWeek}, dayOfMonth: ${dayOfMonth}`)

    // Fetch all active recurring activities
    const { data: recurringActivities, error: fetchError } = await supabase
      .from('department_activities')
      .select('id, name, description, department_id, priority, created_by, recurrence_type, recurrence_day, last_recurrence_date')
      .eq('is_recurring', true)
      .eq('recurrence_active', true)
      .is('parent_activity_id', null) // Only parent (template) activities

    if (fetchError) {
      console.error('[process-recurring-activities] Error fetching recurring activities:', fetchError)
      throw fetchError
    }

    if (!recurringActivities || recurringActivities.length === 0) {
      console.log('[process-recurring-activities] No active recurring activities found')
      return new Response(
        JSON.stringify({ message: 'No recurring activities to process', created: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[process-recurring-activities] Found ${recurringActivities.length} recurring activities`)

    let createdCount = 0
    const errors: string[] = []

    for (const activity of recurringActivities as RecurringActivity[]) {
      try {
        // Check if we should create a new instance today
        const shouldCreate = shouldCreateToday(activity, todayStr, dayOfWeek, dayOfMonth)
        
        if (!shouldCreate) {
          console.log(`[process-recurring-activities] Skipping activity ${activity.id} - not scheduled for today`)
          continue
        }

        // Check if already created today
        if (activity.last_recurrence_date === todayStr) {
          console.log(`[process-recurring-activities] Skipping activity ${activity.id} - already created today`)
          continue
        }

        // Calculate deadline based on recurrence type
        const deadline = calculateNextDeadline(activity.recurrence_type, activity.recurrence_day, today)

        // Create new activity instance
        const { error: insertError } = await supabase
          .from('department_activities')
          .insert({
            name: activity.name,
            description: activity.description,
            department_id: activity.department_id,
            priority: activity.priority,
            created_by: activity.created_by,
            deadline: deadline,
            parent_activity_id: activity.id,
            is_recurring: false,
            status: 'pendente'
          })

        if (insertError) {
          console.error(`[process-recurring-activities] Error creating activity instance for ${activity.id}:`, insertError)
          errors.push(`Activity ${activity.id}: ${insertError.message}`)
          continue
        }

        // Update last_recurrence_date
        const { error: updateError } = await supabase
          .from('department_activities')
          .update({ last_recurrence_date: todayStr })
          .eq('id', activity.id)

        if (updateError) {
          console.error(`[process-recurring-activities] Error updating last_recurrence_date for ${activity.id}:`, updateError)
        }

        createdCount++
        console.log(`[process-recurring-activities] Created instance for activity ${activity.id}`)
      } catch (activityError) {
        console.error(`[process-recurring-activities] Error processing activity ${activity.id}:`, activityError)
        errors.push(`Activity ${activity.id}: ${activityError}`)
      }
    }

    console.log(`[process-recurring-activities] Completed. Created ${createdCount} activities. Errors: ${errors.length}`)

    return new Response(
      JSON.stringify({ 
        message: 'Recurring activities processed', 
        created: createdCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[process-recurring-activities] Fatal error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function shouldCreateToday(
  activity: RecurringActivity,
  todayStr: string,
  dayOfWeek: number,
  dayOfMonth: number
): boolean {
  switch (activity.recurrence_type) {
    case 'daily':
      return true
    case 'weekly':
      return activity.recurrence_day === dayOfWeek
    case 'monthly':
      // Handle end of month cases (e.g., recurrence_day = 31 but month has 30 days)
      if (activity.recurrence_day === dayOfMonth) return true
      // If it's the last day of the month and recurrence_day > last day
      const today = new Date(todayStr)
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
      if (dayOfMonth === lastDayOfMonth && activity.recurrence_day !== null && activity.recurrence_day > lastDayOfMonth) {
        return true
      }
      return false
    default:
      return false
  }
}

function calculateNextDeadline(
  recurrenceType: string,
  recurrenceDay: number | null,
  today: Date
): string {
  const deadline = new Date(today)
  
  switch (recurrenceType) {
    case 'daily':
      // Deadline is today
      break
    case 'weekly':
      // Deadline is next occurrence of the same day
      deadline.setDate(deadline.getDate() + 7)
      break
    case 'monthly':
      // Deadline is next month same day
      deadline.setMonth(deadline.getMonth() + 1)
      if (recurrenceDay !== null) {
        const lastDay = new Date(deadline.getFullYear(), deadline.getMonth() + 1, 0).getDate()
        deadline.setDate(Math.min(recurrenceDay, lastDay))
      }
      break
  }
  
  return deadline.toISOString().split('T')[0]
}
