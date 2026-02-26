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

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2025-08-27.basil",
  });

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${err}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const paymentId = session.metadata?.rent_payment_id;

    if (paymentId && session.payment_status === "paid") {
      // Get the payment intent for receipt
      let receiptUrl: string | null = null;
      if (session.payment_intent) {
        const pi = await stripe.paymentIntents.retrieve(session.payment_intent as string);
        if (pi.latest_charge) {
          const charge = await stripe.charges.retrieve(pi.latest_charge as string);
          receiptUrl = charge.receipt_url || null;
        }
      }

      const { data: payment } = await supabase
        .from("rent_payments")
        .select("amount, late_fee")
        .eq("id", paymentId)
        .single();

      const totalPaid = payment ? Number(payment.amount) + Number(payment.late_fee || 0) : 0;

      await supabase
        .from("rent_payments")
        .update({
          status: "paid",
          paid_amount: totalPaid,
          paid_date: new Date().toISOString().split("T")[0],
          payment_method: "stripe",
          stripe_payment_intent_id: session.payment_intent as string,
          receipt_url: receiptUrl,
          reference: session.id,
        })
        .eq("id", paymentId);

      console.log(`Payment ${paymentId} marked as paid via Stripe`);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
