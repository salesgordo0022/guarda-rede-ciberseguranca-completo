import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Client with service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the authorization header to verify the calling user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the calling user is an admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, fullName, companyId, role, departmentIds } = await req.json();

    // Verify the calling user is an admin of the company
    const { data: userCompany } = await supabaseAdmin
      .from("user_companies")
      .select("role")
      .eq("user_id", callingUser.id)
      .eq("company_id", companyId)
      .single();

    if (!userCompany || userCompany.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can create team members" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId: string;

    if (existingUser) {
      // User already exists, check if already in this company
      const { data: existingCompanyLink } = await supabaseAdmin
        .from("user_companies")
        .select("id")
        .eq("user_id", existingUser.id)
        .eq("company_id", companyId)
        .single();

      if (existingCompanyLink) {
        return new Response(
          JSON.stringify({ error: "Este usuário já faz parte desta empresa" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = existingUser.id;
      console.log("User exists, adding to company:", userId);
    } else {
      // Create the new user with admin API
      const tempPassword = Math.random().toString(36).slice(-12) + "A1!";
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
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

    // Add user to company with the specified role
    const { error: companyError } = await supabaseAdmin
      .from("user_companies")
      .insert({
        user_id: userId,
        company_id: companyId,
        role: role,
      });

    if (companyError) {
      console.error("Failed to add user to company:", companyError);
      return new Response(
        JSON.stringify({ error: "Falha ao adicionar usuário à empresa: " + companyError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    // Send password reset email so user can set their own password
    await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: email,
    });

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
