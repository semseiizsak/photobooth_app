import { NextResponse } from "next/server";
import { db } from "@/lib/pb";

export const dynamic = "force-dynamic";

// Streams the guest's photo strip from private storage. The strip id is an
// unguessable UUID from the QR code — that is the access control.
export async function GET(req, { params }) {
  const { id } = await params;
  const sb = db();
  const { data: strip } = await sb.from("pb_strips").select("*").eq("id", id).single();
  if (!strip || new Date(strip.expires_at) < new Date())
    return new NextResponse("Not found", { status: 404 });

  const { data: blob, error } = await sb.storage.from("strips").download(strip.storage_path);
  if (error || !blob) return new NextResponse("Not found", { status: 404 });

  const buf = Buffer.from(await blob.arrayBuffer());
  const dl = new URL(req.url).searchParams.has("download");
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=3600",
      ...(dl ? { "Content-Disposition": 'attachment; filename="photoautomat.jpg"' } : {}),
    },
  });
}
