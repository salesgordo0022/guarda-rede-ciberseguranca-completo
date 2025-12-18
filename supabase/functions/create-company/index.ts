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

    const { name, description, cnpj } = await req.json();

    if (!name || !name.trim()) {
      return new Response(
        JSON.stringify({ error: "Nome da empresa é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Criar a empresa
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({
        name: name.trim(),
        description: description || null,
        cnpj: cnpj || null,
        created_by: callingUser.id,
      })
      .select()
      .single();

    if (companyError) {
      console.error("Company creation error:", companyError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar empresa: " + companyError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar todas as empresas onde o usuário criador é admin
    const { data: userAdminCompanies } = await supabaseAdmin
      .from("user_companies")
      .select("company_id")
      .eq("user_id", callingUser.id)
      .eq("role", "admin");

    const adminCompanyIds = userAdminCompanies?.map(uc => uc.company_id) || [];

    // Buscar todos os admins dessas empresas (exceto o criador)
    const { data: otherAdmins } = await supabaseAdmin
      .from("user_companies")
      .select("user_id")
      .in("company_id", adminCompanyIds)
      .eq("role", "admin")
      .neq("user_id", callingUser.id);

    // Obter IDs únicos dos outros admins
    const uniqueAdminIds = [...new Set(otherAdmins?.map(a => a.user_id) || [])];

    // Vincular o criador como admin da nova empresa
    await supabaseAdmin.from("user_companies").insert({
      user_id: callingUser.id,
      company_id: company.id,
      role: "admin",
    });

    // Vincular todos os outros admins à nova empresa
    if (uniqueAdminIds.length > 0) {
      const adminInserts = uniqueAdminIds.map(adminId => ({
        user_id: adminId,
        company_id: company.id,
        role: "admin" as const,
      }));

      const { error: insertError } = await supabaseAdmin
        .from("user_companies")
        .insert(adminInserts);

      if (insertError) {
        console.error("Error adding other admins:", insertError);
        // Não falhar, apenas logar
      }
    }

    console.log(`Company ${company.id} created. Added ${uniqueAdminIds.length + 1} admins.`);

    return new Response(
      JSON.stringify({ success: true, company }),
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
