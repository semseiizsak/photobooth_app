import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/pb";

export const dynamic = "force-dynamic";

function newKey() {
  const chunk = () => randomBytes(2).toString("hex").toUpperCase();
  return `PB-${chunk()}-${chunk()}-${chunk()}-${chunk()}`;
}

const PLAN_DURATION_MS = { trial: 30 * 86400_000, event_pass: 24 * 3600_000 };

// Pixture-style pairing: the booth's first-run screen posts the 6-digit code
// shown in the dashboard. One call binds everything a booth needs — its
// telemetry token, identity, and a machine-bound license — so nobody ever
// types license keys on a kiosk keyboard or edits config files by hand.
export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const code = String(body.code || "").trim();
  const machine_id = String(body.machine_id || "").trim();
  if (!/^\d{6}$/.test(code) || !machine_id)
    return NextResponse.json({ error: "Enter the 6-digit code from the dashboard." }, { status: 400 });

  const sb = db();
  const { data: pc } = await sb.from("pb_pairing_codes").select("*").eq("code", code).single();
  if (!pc || pc.used_at)
    return NextResponse.json({ error: "Unknown or already-used code. Generate a new one in the dashboard." }, { status: 404 });
  if (new Date(pc.expires_at) < new Date())
    return NextResponse.json({ error: "This code has expired. Generate a new one in the dashboard." }, { status: 410 });

  const { data: booth } = await sb.from("pb_booths")
    .select("id,kabin_id,name,token,org_id").eq("id", pc.booth_id).single();
  if (!booth) return NextResponse.json({ error: "Booth no longer exists." }, { status: 404 });

  const now = new Date();
  const license_key = newKey();
  const expires_at = PLAN_DURATION_MS[pc.plan]
    ? new Date(now.getTime() + PLAN_DURATION_MS[pc.plan]).toISOString() : null;

  const { error: licErr } = await sb.from("pb_licenses").insert({
    license_key,
    plan: pc.plan,
    machine_id,
    org_id: booth.org_id,
    activated_at: now.toISOString(),
    last_validated: now.toISOString(),
    expires_at,
  });
  if (licErr) return NextResponse.json({ error: "Could not issue license." }, { status: 500 });

  await sb.from("pb_pairing_codes").update({ used_at: now.toISOString() }).eq("code", code);
  await sb.from("pb_booths").update({ last_seen_at: now.toISOString() }).eq("id", booth.id);

  const origin = process.env.PUBLIC_ORIGIN || "https://www.photoautomat.hu";
  return NextResponse.json({
    ok: true,
    booth_token: booth.token,
    kabin_id: booth.kabin_id,
    booth_name: booth.name,
    api_url: origin,
    license_key,
    plan: pc.plan,
  });
}
