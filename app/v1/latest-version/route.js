import { NextResponse } from "next/server";
import { db } from "@/lib/pb";

export const dynamic = "force-dynamic";

// Booth update check (app/activation.py check_for_update, 2s timeout).
// Returns {"version": "...", "download_url": "..."}; the booth shows an
// update notice when version differs from its APP_VERSION.
export async function GET() {
  const { data } = await db().from("pb_settings").select("value")
    .eq("key", "latest_version").single();
  return NextResponse.json(data?.value || { version: "", download_url: "" });
}
