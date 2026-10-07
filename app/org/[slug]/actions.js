"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/pb";

// Partner self-serve pairing. Server-action arguments are client-supplied,
// so authorization is re-checked HERE against the org's access code from the
// Basic-auth header — a partner can only ever mint codes for their own
// booths, with the plan locked to their subscription's plan.
export async function orgGeneratePairingCode(slug, boothId) {
  const sb = db();
  const { data: org } = await sb.from("pb_organizations")
    .select("id,plan,access_code").eq("slug", slug).single();
  if (!org) return;

  const h = await headers();
  const auth = h.get("authorization") || "";
  let pass = null;
  if (auth.startsWith("Basic ")) {
    try {
      const dec = atob(auth.slice(6));
      pass = dec.slice(dec.indexOf(":") + 1);
    } catch { /* no-op */ }
  }
  if (!pass || pass !== org.access_code) return;

  const { data: booth } = await sb.from("pb_booths")
    .select("id").eq("id", boothId).eq("org_id", org.id).single();
  if (!booth) return;

  await sb.from("pb_pairing_codes").delete().eq("booth_id", booth.id);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await sb.from("pb_pairing_codes").insert({
    code, booth_id: booth.id,
    plan: ["pro", "trial", "event_pass"].includes(org.plan) ? org.plan : "pro",
  });
  revalidatePath(`/org/${slug}`);
}
