import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/pb";
import { sendEmail, welcomeEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// Stripe → fully automatic provisioning. On a paid checkout:
//   1. create the partner org (slug, access code) bound to the subscription
//   2. create one booth row per purchased quantity
//   3. email the buyer their dashboard link, access code and next steps
// Licenses are NOT minted here — they are issued at pairing time, one active
// license per booth (see /v1/pair), so a buyer can never mint more licenses
// than booths. Subscription lapse/failure lapses every license in the org.
//
// Requires env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (+ RESEND_API_KEY
// for the email). Stripe webhook events to subscribe:
//   checkout.session.completed, customer.subscription.deleted,
//   invoice.payment_failed

function slugify(base) {
  return String(base).toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

async function lapseOrgLicenses(sb, subscriptionId) {
  const { data: org } = await sb.from("pb_organizations")
    .select("id").eq("stripe_subscription_id", subscriptionId).maybeSingle();
  if (org) {
    await sb.from("pb_licenses").update({ status: "lapsed" })
      .eq("org_id", org.id).eq("status", "active");
  }
  // Legacy licenses created directly on a subscription (pre-provisioning)
  await sb.from("pb_licenses").update({ status: "lapsed" })
    .eq("stripe_subscription_id", subscriptionId).eq("status", "active");
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
    const email = s.customer_details?.email || s.customer_email || null;
    const name = s.customer_details?.name || (email ? email.split("@")[0] : "Operator");

    // Idempotency — Stripe retries webhooks
    const { data: existing } = await sb.from("pb_organizations")
      .select("id").eq("stripe_subscription_id", s.subscription).maybeSingle();
    if (existing) return NextResponse.json({ received: true, dedup: true });

    // Booth quantity from the purchased line items (1 subscription seat = 1 booth)
    let qty = 1;
    try {
      const items = await stripe.checkout.sessions.listLineItems(s.id, { limit: 10 });
      qty = Math.min(20, Math.max(1,
        items.data.reduce((n, li) => n + (li.quantity || 1), 0)));
    } catch { /* default 1 */ }

    let slug = slugify(name) || slugify(email?.split("@")[0] || "") || "partner";
    const { data: taken } = await sb.from("pb_organizations").select("id").eq("slug", slug).maybeSingle();
    if (taken) slug = `${slug}-${randomBytes(2).toString("hex")}`;

    const { data: org, error: orgErr } = await sb.from("pb_organizations").insert({
      name, slug, email,
      access_code: randomBytes(9).toString("hex"),
      plan: s.metadata?.plan || "pro",
      stripe_customer_id: s.customer || null,
      stripe_subscription_id: s.subscription || null,
    }).select("*").single();
    if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 });

    const booths = Array.from({ length: qty }, (_, i) => ({
      kabin_id: `${slug}-${i + 1}`,
      name: `${name.toUpperCase().slice(0, 24)} ${i + 1}`,
      location: "",
      org_id: org.id,
      token: randomBytes(24).toString("hex"),
    }));
    await sb.from("pb_booths").insert(booths);

    if (email) {
      const { data: ver } = await sb.from("pb_settings").select("value")
        .eq("key", "latest_version").single();
      await sendEmail({
        to: email,
        replyTo: "info@photoautomat.hu",
        subject: "Your PHOTOAUTOMAT software is ready — next steps",
        html: welcomeEmail({
          orgName: name, slug: org.slug, accessCode: org.access_code,
          downloadUrl: ver?.value?.download_url || "",
        }),
      });
    }
  }

  if (event.type === "customer.subscription.deleted")
    await lapseOrgLicenses(sb, event.data.object.id);

  if (event.type === "invoice.payment_failed" && event.data.object.subscription)
    await lapseOrgLicenses(sb, event.data.object.subscription);

  return NextResponse.json({ received: true });
}
