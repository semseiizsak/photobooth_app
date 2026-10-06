import { NextResponse } from "next/server";
import { db } from "@/lib/pb";

export const dynamic = "force-dynamic";

const SEVERITIES = new Set(["info", "warning", "error"]);

export async function POST(req) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = db();
  const { data: booth } = await sb.from("pb_booths").select("id").eq("token", token).single();
  if (!booth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  const events = Array.isArray(body.events) ? body.events.slice(0, 100) : [];
  if (events.length === 0) return NextResponse.json({ ok: true, inserted: 0 });

  const rows = events.map((e) => ({
    booth_id: booth.id,
    type: String(e.type || "unknown").slice(0, 64),
    severity: SEVERITIES.has(e.severity) ? e.severity : "info",
    amount: Number.isFinite(e.amount) ? Math.round(e.amount) : null,
    data: e.data && typeof e.data === "object" ? e.data : {},
    occurred_at: e.occurred_at || new Date().toISOString(),
  }));

  const { error } = await sb.from("pb_events").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await sb.from("pb_booths").update({ last_seen_at: new Date().toISOString() }).eq("id", booth.id);

  return NextResponse.json({ ok: true, inserted: rows.length });
}
