"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { db } from "@/lib/pb";

export async function createBooth(formData) {
  const name = (formData.get("name") || "").toString().trim().slice(0, 60);
  const location = (formData.get("location") || "").toString().trim().slice(0, 80);
  if (!name) return;
  const kabin_id = name.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 40) || `booth-${Date.now()}`;
  await db().from("pb_booths").insert({
    kabin_id,
    name: name.toUpperCase(),
    location,
    token: randomBytes(24).toString("hex"),
  });
  revalidatePath("/dashboard");
}
