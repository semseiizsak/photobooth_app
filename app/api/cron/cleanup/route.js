import { NextResponse } from "next/server";
import { db } from "@/lib/pb";

export const dynamic = "force-dynamic";

// Daily housekeeping (vercel.json cron): deletes expired guest strips from
// storage + DB, and trims heartbeat history older than 14 days.
export async function GET(req) {
  const isVercelCron = req.headers.get("x-vercel-cron") != null;
  const secret = process.env.CRON_SECRET;
  const auth = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!isVercelCron && (!secret || auth !== secret))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = db();
  const now = new Date().toISOString();

  const { data: expired } = await sb.from("pb_strips")
    .select("id,storage_path").lt("expires_at", now).limit(500);
  if ((expired || []).length > 0) {
    await sb.storage.from("strips").remove(expired.map((s) => s.storage_path));
    await sb.from("pb_strips").delete().in("id", expired.map((s) => s.id));
  }

  const cutoff = new Date(Date.now() - 14 * 86400_000).toISOString();
  await sb.from("pb_heartbeats").delete().lt("created_at", cutoff);

  // Lapse timed licenses (trial / event_pass) that ran out
  await sb.from("pb_licenses").update({ status: "lapsed" })
    .eq("status", "active").lt("expires_at", now);

  // Alert sweep fallback for days with zero heartbeats fleet-wide
  try {
    const { runAlertSweep } = await import("@/lib/alerts");
    await runAlertSweep(sb);
  } catch { /* best-effort */ }

  return NextResponse.json({ ok: true, strips_deleted: (expired || []).length });
}
