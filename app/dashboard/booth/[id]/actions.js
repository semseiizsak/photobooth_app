"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/pb";

// All actions are reachable only through /dashboard pages, which sit behind
// the ADMIN_PASSWORD Basic-auth middleware.

export async function sendCommand(boothId, command) {
  if (!["restart", "test_print"].includes(command)) return;
  await db().from("pb_commands").insert({ booth_id: boothId, command });
  revalidatePath(`/dashboard/booth/${boothId}`);
}

export async function saveRemoteConfig(boothId, formData) {
  const cfg = {};
  const price = parseInt(formData.get("price"), 10);
  const countdown = parseInt(formData.get("countdown"), 10);
  const autoReset = parseInt(formData.get("auto_reset"), 10);
  if (Number.isFinite(price) && price > 0) cfg["payment.price_units"] = price;
  if (Number.isFinite(countdown) && countdown > 0) cfg["shooting.countdown_seconds"] = countdown;
  if (Number.isFinite(autoReset) && autoReset > 0) cfg["error.printer_auto_reset_seconds"] = autoReset;
  await db().from("pb_booths").update({ remote_config: cfg }).eq("id", boothId);
  revalidatePath(`/dashboard/booth/${boothId}`);
}
