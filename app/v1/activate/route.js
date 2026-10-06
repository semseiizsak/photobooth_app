import { NextResponse } from "next/server";
import { db } from "@/lib/pb";

export const dynamic = "force-dynamic";

// Called once by the booth app on first run (app/activation.py activate_online).
// Contract: 200 = activated; 403/404 = {"error": message}; other = server error.
export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const { license_key, machine_id } = body || {};
  if (!license_key || !machine_id)
    return NextResponse.json({ error: "license_key and machine_id required" }, { status: 400 });

  const sb = db();
  const { data: lic } = await sb.from("pb_licenses").select("*")
    .eq("license_key", license_key).single();

  if (!lic)
    return NextResponse.json({ error: "Invalid license key." }, { status: 404 });
  if (lic.status === "revoked")
    return NextResponse.json({ error: "This license has been deactivated." }, { status: 403 });
  if (lic.status === "lapsed")
    return NextResponse.json({ error: "This license has expired. Renew your subscription." }, { status: 403 });
  if (lic.machine_id && lic.machine_id !== machine_id)
    return NextResponse.json({ error: "License already activated on another machine. Contact support to migrate it." }, { status: 403 });

  await sb.from("pb_licenses").update({
    machine_id,
    activated_at: lic.activated_at || new Date().toISOString(),
    last_validated: new Date().toISOString(),
  }).eq("id", lic.id);

  return NextResponse.json({ ok: true });
}
