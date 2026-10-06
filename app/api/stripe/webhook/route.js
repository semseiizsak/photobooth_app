import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/pb";

export const dynamic = "force-dynamic";

// Stripe → license lifecycle. Inactive until STRIPE_SECRET_KEY and
// STRIPE_WEBHOOK_SECRET are set in Vercel and a webhook pointing at
// /api/stripe/webhook is added in the Stripe dashboard for the events:
//   checkout.session.completed, customer.subscription.deleted,
//   invoice.payment_failed
// The checkout link/product is created in Stripe; this handler turns a paid
// subscription into an active license key (emailed manually for now — key is
// visible on /dashboard/licenses).

function newKey() {
  const chunk = () => randomBytes(2).toString("hex").toUpperCase();
  return `PB-${chunk()}-${chunk()}-${chunk()}-${chunk()}`;
}

export async function POST(req) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !whSecret)
    return NextResponse.json({ error: "stripe not configured" }, { status: 503 });

  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(secretKey);

  let event;
  try {
    const sig = req.headers.get("stripe-signature");
    const raw = await req.text();
    event = stripe.webhooks.constructEvent(raw, sig, whSecret);
  } catch (e) {
    return NextResponse.json({ error: `signature: ${e.message}` }, { status: 400 });
  }

  const sb = db();

  if (event.type === "checkout.session.completed") {
    const s = event.data.object;
    await sb.from("pb_licenses").insert({
      license_key: newKey(),
      plan: s.metadata?.plan || "pro",
      email: s.customer_details?.email || s.customer_email || null,
      stripe_customer_id: s.customer || null,
      stripe_subscription_id: s.subscription || null,
    });
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    await sb.from("pb_licenses").update({ status: "lapsed" })
      .eq("stripe_subscription_id", sub.id);
  }

  if (event.type === "invoice.payment_failed") {
    const inv = event.data.object;
    if (inv.subscription)
      await sb.from("pb_licenses").update({ status: "lapsed" })
        .eq("stripe_subscription_id", inv.subscription);
  }

  return NextResponse.json({ received: true });
}
