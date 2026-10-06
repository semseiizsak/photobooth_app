"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { db } from "@/lib/pb";

export async function createOrg(formData) {
  const name = (formData.get("name") || "").toString().slice(0, 100).trim();
  const slug = (formData.get("slug") || "").toString().toLowerCase()
    .replace(/[^a-z0-9-]/g, "").slice(0, 50);
  if (!name || !slug) return;
  await db().from("pb_organizations").insert({
    name, slug, access_code: randomBytes(9).toString("hex"),
  });
  revalidatePath("/dashboard/orgs");
}

export async function rotateAccessCode(orgId) {
  await db().from("pb_organizations")
    .update({ access_code: randomBytes(9).toString("hex") }).eq("id", orgId);
  revalidatePath("/dashboard/orgs");
}

export async function assignBooth(formData) {
  const boothId = formData.get("booth_id");
  const orgId = formData.get("org_id") || null;
  if (!boothId) return;
  await db().from("pb_booths").update({ org_id: orgId || null }).eq("id", boothId);
  revalidatePath("/dashboard/orgs");
}
