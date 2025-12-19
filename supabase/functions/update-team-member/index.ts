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

    const { userId, companyId, role, departmentIds, password, fullName, email, companyIds } = await req.json();

    // Verify the calling user is an admin of the company
    const { data: userCompany } = await supabaseAdmin
      .from("user_companies")
      .select("role")
      .eq("user_id", callingUser.id)
      .eq("company_id", companyId)
      .maybeSingle();

    if (!userCompany || userCompany.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Apenas admins podem editar membros da equipe" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update password if provided
    if (password && password.length >= 6) {
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password,
      });

      if (passwordError) {
        console.error("Password update error:", passwordError);
        return new Response(
          JSON.stringify({ error: "Erro ao atualizar senha: " + passwordError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("Password updated for user:", userId);
    }

    // Update email if provided
    if (email) {
      // Update in auth
      const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: email,
      });

      if (emailError) {
        console.error("Email update error:", emailError);
        return new Response(
          JSON.stringify({ error: "Erro ao atualizar email: " + emailError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update in profiles table
      const { error: profileEmailError } = await supabaseAdmin
        .from("profiles")
        .update({ email: email })
        .eq("id", userId);

      if (profileEmailError) {
        console.error("Profile email update error:", profileEmailError);
      }
      console.log("Email updated for user:", userId);
    }

    // Update full name if provided
    if (fullName) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", userId);

      if (profileError) {
        console.error("Profile update error:", profileError);
      }

      // Also update auth metadata
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { full_name: fullName },
      });
    }

    // Update companies if provided
    if (companyIds !== undefined && Array.isArray(companyIds)) {
      // Remove existing company assignments
      await supabaseAdmin
        .from("user_companies")
        .delete()
        .eq("user_id", userId);

      // Add new company assignments
      if (companyIds.length > 0) {
        const companyInserts = companyIds.map((cId: string, index: number) => ({
          user_id: userId,
          company_id: cId,
          role: index === 0 ? role : "colaborador", // First company gets the selected role
        }));

        const { error: companyError } = await supabaseAdmin
          .from("user_companies")
          .insert(companyInserts);

        if (companyError) {
          console.error("Company update error:", companyError);
          return new Response(
            JSON.stringify({ error: "Erro ao atualizar empresas: " + companyError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } else if (role) {
      // Update role in user_companies only if companyIds not provided
      const { error: roleError } = await supabaseAdmin
        .from("user_companies")
        .update({ role })
        .eq("user_id", userId)
        .eq("company_id", companyId);

      if (roleError) {
        console.error("Role update error:", roleError);
        return new Response(
          JSON.stringify({ error: "Erro ao atualizar função: " + roleError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Update departments - only for the current company
    if (departmentIds !== undefined) {
      // Get departments of the current company
      const { data: companyDepts } = await supabaseAdmin
        .from("departments")
        .select("id")
        .eq("company_id", companyId);

      const companyDeptIds = companyDepts?.map(d => d.id) || [];

      if (companyDeptIds.length > 0) {
        // Remove only the department assignments for this company's departments
        await supabaseAdmin
          .from("user_departments")
          .delete()
          .eq("user_id", userId)
          .in("department_id", companyDeptIds);
      }

      // Add new department assignments
      if (departmentIds.length > 0) {
        const deptInserts = departmentIds.map((deptId: string) => ({
          user_id: userId,
          department_id: deptId,
        }));

        const { error: deptError } = await supabaseAdmin
          .from("user_departments")
          .insert(deptInserts);

        if (deptError) {
          console.error("Department update error:", deptError);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
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
