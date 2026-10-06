import { NextResponse } from "next/server";
import { db } from "@/lib/pb";

export const dynamic = "force-dynamic";

// Booth heartbeat (60s). The response doubles as the remote-management
// channel: it carries any queued commands (restart, test_print), the booth's
// remote config overrides, and the current latest-version info.
export async function POST(req) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = db();
  const { data: booth } = await sb.from("pb_booths")
    .select("id,remote_config").eq("token", token).single();
  if (!booth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let hb;
  try { hb = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  const [{ data: cmds }] = await Promise.all([
    sb.from("pb_commands").select("id,command,args")
      .eq("booth_id", booth.id).eq("status", "pending").order("created_at"),
    sb.from("pb_booths").update({
      last_seen_at: new Date().toISOString(),
      last_heartbeat: hb,
    }).eq("id", booth.id),
    sb.from("pb_heartbeats").insert({ booth_id: booth.id, payload: hb }),
  ]);

  if ((cmds || []).length > 0) {
    await sb.from("pb_commands")
      .update({ status: "delivered", delivered_at: new Date().toISOString() })
      .in("id", cmds.map((c) => c.id));
  }

  return NextResponse.json({
    ok: true,
    commands: cmds || [],
    config: booth.remote_config || {},
  });
}
