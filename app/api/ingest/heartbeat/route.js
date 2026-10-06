import { NextResponse } from "next/server";
import { db } from "@/lib/pb";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = db();
  const { data: booth } = await sb.from("pb_booths").select("id").eq("token", token).single();
  if (!booth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let hb;
  try { hb = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  await Promise.all([
    sb.from("pb_booths").update({
      last_seen_at: new Date().toISOString(),
      last_heartbeat: hb,
    }).eq("id", booth.id),
    sb.from("pb_heartbeats").insert({ booth_id: booth.id, payload: hb }),
  ]);
  return NextResponse.json({ ok: true });
}
