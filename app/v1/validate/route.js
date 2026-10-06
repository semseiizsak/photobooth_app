import { NextResponse } from "next/server";
import { db } from "@/lib/pb";

export const dynamic = "force-dynamic";

// Weekly revalidation from the booth (app/activation.py validate_online).
// Contract: 200 = valid; 403 = {"error": message} (revoked/lapsed);
// any other status = treated as network trouble → booth applies grace period.
export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const { license_key, machine_id } = body || {};

  const sb = db();
  const { data: lic } = await sb.from("pb_licenses").select("*")
    .eq("license_key", license_key || "").single();

  if (!lic || (lic.machine_id && lic.machine_id !== machine_id))
    return NextResponse.json({ error: "License is not valid for this machine." }, { status: 403 });
  if (lic.expires_at && new Date(lic.expires_at) < new Date()) {
    await sb.from("pb_licenses").update({ status: "lapsed" }).eq("id", lic.id);
    return NextResponse.json({ error: "This license has expired. Renew to keep using the booth software." }, { status: 403 });
  }
  if (lic.status !== "active")
    return NextResponse.json({ error: lic.status === "lapsed"
      ? "Subscription lapsed. Renew to keep using the booth software."
      : "This license has been deactivated." }, { status: 403 });

  await sb.from("pb_licenses").update({ last_validated: new Date().toISOString() }).eq("id", lic.id);
  return NextResponse.json({ ok: true });
}
