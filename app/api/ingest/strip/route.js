import { NextResponse } from "next/server";
import { db } from "@/lib/pb";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024; // strips are ~0.5 MB JPEGs

// Booth uploads the finished strip; returns the guest share URL that the
// booth renders as a QR code on the printing screen. Strips auto-expire
// after 30 days (pb_strips.expires_at + /api/cron/cleanup).
export async function POST(req) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = db();
  const { data: booth } = await sb.from("pb_booths").select("id").eq("token", token).single();
  if (!booth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  let bytes;
  try {
    bytes = Buffer.from(String(body.data || ""), "base64");
  } catch {
    return NextResponse.json({ error: "bad base64" }, { status: 400 });
  }
  if (!bytes || bytes.length === 0 || bytes.length > MAX_BYTES)
    return NextResponse.json({ error: "bad size" }, { status: 400 });

  const { data: row, error: insErr } = await sb.from("pb_strips")
    .insert({ booth_id: booth.id, storage_path: "pending" })
    .select("id").single();
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  const path = `${row.id}.jpg`;
  const { error: upErr } = await sb.storage.from("strips")
    .upload(path, bytes, { contentType: "image/jpeg" });
  if (upErr) {
    await sb.from("pb_strips").delete().eq("id", row.id);
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }
  await sb.from("pb_strips").update({ storage_path: path }).eq("id", row.id);

  const origin = process.env.PUBLIC_ORIGIN || "https://www.photoautomat.hu";
  return NextResponse.json({ ok: true, url: `${origin}/s/${row.id}` });
}
