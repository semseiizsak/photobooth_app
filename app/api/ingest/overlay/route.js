import { NextResponse } from "next/server";
import { db } from "@/lib/pb";

export const dynamic = "force-dynamic";

// Booth downloads its print overlay/template PNG (uploaded in the dashboard).
// Authenticated with the booth's bearer token like all ingest routes.
export async function GET(req) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = db();
  const { data: booth } = await sb.from("pb_booths").select("id").eq("token", token).single();
  if (!booth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: blob, error } = await sb.storage.from("templates").download(`${booth.id}.png`);
  if (error || !blob) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(Buffer.from(await blob.arrayBuffer()), {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}
