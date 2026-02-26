import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("Not authenticated");

    const user = userData.user;
    const { paymentId } = await req.json();
    if (!paymentId) throw new Error("paymentId required");

    // Get payment details
    const { data: payment, error: payErr } = await supabase
      .from("rent_payments")
      .select("*, tenancies!inner(tenant_id, listing_id, listings:listing_id(title))")
      .eq("id", paymentId)
      .single();

    if (payErr || !payment) throw new Error("Payment not found");
    if (payment.tenancies.tenant_id !== user.id) throw new Error("Unauthorized");
    if (payment.status === "paid") throw new Error("Already paid");

    const totalDue = Number(payment.amount) - Number(payment.paid_amount || 0) + Number(payment.late_fee || 0);
    const amountInPence = Math.round(totalDue * 100);
    const currency = payment.currency || "gbp";

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const listingTitle = (payment.tenancies as any).listings?.title || "Property";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      payment_method_types: ["card", "bacs_debit"],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `Rent Payment — ${listingTitle}`,
              description: `Due: ${payment.due_date}${Number(payment.late_fee) > 0 ? ` (incl. £${payment.late_fee} late fee)` : ""}`,
            },
            unit_amount: amountInPence,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        rent_payment_id: paymentId,
        tenant_id: user.id,
      },
      success_url: `${req.headers.get("origin")}/dashboard/tenancy?payment=success`,
      cancel_url: `${req.headers.get("origin")}/dashboard/tenancy?payment=cancelled`,
    });

    // Store checkout session ID
    await supabase
      .from("rent_payments")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", paymentId);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
