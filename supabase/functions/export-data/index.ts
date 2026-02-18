import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get user's companies
    const { data: userCompanies } = await supabase
      .from('user_companies')
      .select('company_id, role')
      .eq('user_id', user.id)

    const companyIds = (userCompanies || []).map((uc) => uc.company_id)

    if (companyIds.length === 0) {
      return new Response(
        JSON.stringify({ exported_at: new Date().toISOString(), companies: [], departments: [], projects: [], department_activities: [], project_activities: [], profiles: [], user_departments: [], notifications: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch all data in parallel
    const [
      companies,
      departments,
      projects,
      deptActivities,
      projActivities,
      profiles,
      userDepts,
      notifications,
      userScores,
    ] = await Promise.all([
      supabase.from('companies').select('*').in('id', companyIds),
      supabase.from('departments').select('*').in('company_id', companyIds),
      supabase.from('projects').select('*').in('company_id', companyIds),
      supabase.from('department_activities').select(`*, department_activity_assignees(user_id), department_activity_checklist(*), department_activity_comments(content, created_at, user_id)`).in('department_id', 
        await supabase.from('departments').select('id').in('company_id', companyIds).then(r => (r.data || []).map(d => d.id))
      ),
      supabase.from('project_activities').select(`*, project_activity_assignees(user_id, department_id), project_activity_checklist(*), project_activity_comments(content, created_at, user_id)`).in('project_id',
        await supabase.from('projects').select('id').in('company_id', companyIds).then(r => (r.data || []).map(p => p.id))
      ),
      supabase.from('profiles').select('id, full_name, email, avatar_url, created_at'),
      supabase.from('user_departments').select('*').in('department_id',
        await supabase.from('departments').select('id').in('company_id', companyIds).then(r => (r.data || []).map(d => d.id))
      ),
      supabase.from('notifications').select('*').eq('user_id', user.id),
      supabase.from('user_scores').select('*').in('company_id', companyIds),
    ])

    const exportData = {
      exported_at: new Date().toISOString(),
      exported_by: user.email,
      companies: companies.data || [],
      departments: departments.data || [],
      projects: projects.data || [],
      department_activities: deptActivities.data || [],
      project_activities: projActivities.data || [],
      profiles: profiles.data || [],
      user_departments: userDepts.data || [],
      notifications: notifications.data || [],
      user_scores: userScores.data || [],
    }

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="notaup-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
