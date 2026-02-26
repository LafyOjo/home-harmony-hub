import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { application_id, check_types } = await req.json();
    if (!application_id) {
      return new Response(JSON.stringify({ error: "application_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the application belongs to a listing owned by this user
    const { data: app, error: appErr } = await supabase
      .from("applications")
      .select("id, tenant_id, listing_id, listings(owner_id)")
      .eq("id", application_id)
      .single();

    if (appErr || !app) {
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ownerId = (app as any).listings?.owner_id;
    if (ownerId !== userId) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if screening already exists
    const { data: existing } = await supabase
      .from("screening_requests")
      .select("id, status")
      .eq("application_id", application_id)
      .maybeSingle();

    if (existing && existing.status !== "failed") {
      return new Response(
        JSON.stringify({ error: "Screening already requested", screening: existing }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const defaultChecks = ["credit", "identity", "right_to_rent", "employment", "previous_landlord", "affordability"];

    // Create screening request
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    
    const { data: screening, error: insertErr } = await serviceClient
      .from("screening_requests")
      .insert({
        application_id,
        tenant_id: app.tenant_id,
        landlord_id: userId,
        check_types: check_types || defaultChecks,
        status: "pending",
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TODO: Replace with actual Goodlord API call
    // For now, simulate sending to provider by updating status to "in_progress"
    // In production, you would:
    // 1. Call Goodlord API to create a referencing case
    // 2. Store the provider_reference_id
    // 3. Goodlord will call the screening-webhook when complete
    
    const GOODLORD_API_KEY = Deno.env.get("GOODLORD_API_KEY");
    
    if (GOODLORD_API_KEY) {
      // Real Goodlord integration would go here
      // const response = await fetch("https://api.goodlord.co/v1/references", {
      //   method: "POST",
      //   headers: { Authorization: `Bearer ${GOODLORD_API_KEY}`, "Content-Type": "application/json" },
      //   body: JSON.stringify({ ... })
      // });
      
      await serviceClient
        .from("screening_requests")
        .update({ status: "in_progress" })
        .eq("id", screening.id);
    } else {
      // Demo mode: simulate screening completion after a delay
      // In production, remove this and use webhook callbacks
      await serviceClient
        .from("screening_requests")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          overall_result: "pass",
          summary: "All checks passed. Tenant meets referencing criteria.",
          results: {
            credit: { status: "pass", score: 720, details: "Good credit history, no defaults or CCJs" },
            identity: { status: "pass", details: "Identity verified via government-issued ID" },
            right_to_rent: { status: "pass", details: "UK citizen, right to rent confirmed" },
            employment: { status: "pass", details: "Employment verified with current employer" },
            previous_landlord: { status: "pass", details: "Positive reference from previous landlord" },
            affordability: { status: "pass", ratio: 3.2, details: "Income-to-rent ratio meets threshold (3.2x)" },
          },
        })
        .eq("id", screening.id);
    }

    return new Response(JSON.stringify({ success: true, screening_id: screening.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Screening error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
