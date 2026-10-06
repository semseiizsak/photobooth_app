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

export async function generatePairingCode(boothId, formData) {
  const plan = ["pro", "trial", "event_pass"].includes(formData.get("plan"))
    ? formData.get("plan") : "pro";
  const sb = db();
  // One live code per booth — replace any previous one.
  await sb.from("pb_pairing_codes").delete().eq("booth_id", boothId);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await sb.from("pb_pairing_codes").insert({ code, booth_id: boothId, plan });
  revalidatePath(`/dashboard/booth/${boothId}`);
}

export async function uploadOverlay(boothId, formData) {
  const file = formData.get("overlay");
  if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) return;
  if (file.size > 8 * 1024 * 1024) return;
  const sb = db();
  const bytes = Buffer.from(await file.arrayBuffer());
  const path = `${boothId}.png`;
  await sb.storage.from("templates").upload(path, bytes, {
    contentType: "image/png", upsert: true,
  });
  const { data: booth } = await sb.from("pb_booths").select("remote_config").eq("id", boothId).single();
  await sb.from("pb_booths").update({
    remote_config: { ...(booth?.remote_config || {}), overlay_ver: Date.now() },
  }).eq("id", boothId);
  revalidatePath(`/dashboard/booth/${boothId}`);
}

export async function removeOverlay(boothId) {
  const sb = db();
  await sb.storage.from("templates").remove([`${boothId}.png`]);
  const { data: booth } = await sb.from("pb_booths").select("remote_config").eq("id", boothId).single();
  const rc = { ...(booth?.remote_config || {}) };
  rc.overlay_ver = 0;
  await sb.from("pb_booths").update({ remote_config: rc }).eq("id", boothId);
  revalidatePath(`/dashboard/booth/${boothId}`);
}

export async function saveRemoteConfig(boothId, formData) {
  const sb = db();
  const { data: booth } = await sb.from("pb_booths").select("remote_config").eq("id", boothId).single();
  const cfg = { ...(booth?.remote_config || {}) };   // preserve overlay_ver etc.
  const price = parseInt(formData.get("price"), 10);
  const countdown = parseInt(formData.get("countdown"), 10);
  const autoReset = parseInt(formData.get("auto_reset"), 10);
  if (Number.isFinite(price) && price > 0) cfg["payment.price_units"] = price;
  if (Number.isFinite(countdown) && countdown > 0) cfg["shooting.countdown_seconds"] = countdown;
  if (Number.isFinite(autoReset) && autoReset > 0) cfg["error.printer_auto_reset_seconds"] = autoReset;
  const scale = parseFloat(formData.get("p_scale"));
  const dx = parseInt(formData.get("p_dx"), 10);
  const dy = parseInt(formData.get("p_dy"), 10);
  if (Number.isFinite(scale) && scale >= 0.8 && scale <= 1.2) cfg["printer.scale"] = scale;
  if (Number.isFinite(dx) && Math.abs(dx) <= 200) cfg["printer.offset_x_px"] = dx;
  if (Number.isFinite(dy) && Math.abs(dy) <= 200) cfg["printer.offset_y_px"] = dy;
  await sb.from("pb_booths").update({ remote_config: cfg }).eq("id", boothId);
  revalidatePath(`/dashboard/booth/${boothId}`);
}
