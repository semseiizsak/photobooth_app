"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { db } from "@/lib/pb";

function newKey() {
  const chunk = () => randomBytes(2).toString("hex").toUpperCase();
  return `PB-${chunk()}-${chunk()}-${chunk()}-${chunk()}`;
}

export async function createLicense(formData) {
  const plan = ["pro", "event_pass", "trial"].includes(formData.get("plan"))
    ? formData.get("plan") : "pro";
  const email = (formData.get("email") || "").toString().slice(0, 200) || null;
  await db().from("pb_licenses").insert({ license_key: newKey(), plan, email });
  revalidatePath("/dashboard/licenses");
}

export async function setLicenseStatus(id, status) {
  if (!["active", "revoked", "lapsed"].includes(status)) return;
  await db().from("pb_licenses").update({ status }).eq("id", id);
  revalidatePath("/dashboard/licenses");
}

export async function unbindMachine(id) {
  await db().from("pb_licenses").update({ machine_id: null }).eq("id", id);
  revalidatePath("/dashboard/licenses");
}

export async function saveLatestVersion(formData) {
  const version = (formData.get("version") || "").toString().slice(0, 20);
  const download_url = (formData.get("download_url") || "").toString().slice(0, 500);
  await db().from("pb_settings").upsert({ key: "latest_version", value: { version, download_url } });
  revalidatePath("/dashboard/licenses");
}
