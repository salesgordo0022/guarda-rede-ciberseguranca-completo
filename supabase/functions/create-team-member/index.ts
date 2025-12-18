import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, fullName, companyIds, role, departmentIds, password } = await req.json();

    // Support both single companyId and multiple companyIds
    const companies: string[] = companyIds || [];
    
    if (companies.length === 0) {
      return new Response(
        JSON.stringify({ error: "Selecione pelo menos uma empresa" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Creating user:", { email, fullName, companies, role });

    // Verify the calling user is an admin in at least one of the companies
    let isAdminInAnyCompany = false;
    for (const companyId of companies) {
      const { data: userCompany } = await supabaseAdmin
        .from("user_companies")
        .select("role")
        .eq("user_id", callingUser.id)
        .eq("company_id", companyId)
        .single();

      if (userCompany?.role === "admin") {
        isAdminInAnyCompany = true;
        break;
      }
    }

    if (!isAdminInAnyCompany) {
      return new Response(
        JSON.stringify({ error: "Only admins can create team members" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId: string;

    if (existingUser) {
      // Check if user already exists in any of the selected companies
      for (const companyId of companies) {
        const { data: existingCompanyLink } = await supabaseAdmin
          .from("user_companies")
          .select("id")
          .eq("user_id", existingUser.id)
          .eq("company_id", companyId)
          .single();

        if (existingCompanyLink) {
          return new Response(
            JSON.stringify({ error: `Este usuário já faz parte de uma das empresas selecionadas` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      userId = existingUser.id;
      console.log("User exists, adding to companies:", userId);
    } else {
      // Use the password provided by admin or generate a temporary one
      const userPassword = password || Math.random().toString(36).slice(-12) + "A1!";
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: userPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

      if (createError) {
        console.error("Create user error:", createError);
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!newUser.user) {
        return new Response(
          JSON.stringify({ error: "Failed to create user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;
      console.log("New user created:", userId);
    }

    // Add user to all selected companies with the specified role
    for (const companyId of companies) {
      const { error: companyError } = await supabaseAdmin
        .from("user_companies")
        .insert({
          user_id: userId,
          company_id: companyId,
          role: role,
        });

      if (companyError) {
        console.error("Failed to add user to company:", companyId, companyError);
      }
    }

    // Add user to departments
    if (departmentIds && departmentIds.length > 0) {
      const deptInserts = departmentIds.map((deptId: string) => ({
        user_id: userId,
        department_id: deptId,
      }));

      const { error: deptError } = await supabaseAdmin
        .from("user_departments")
        .insert(deptInserts);

      if (deptError) {
        console.error("Failed to add user to departments:", deptError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: userId, 
          email: email 
        } 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
