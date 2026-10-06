import { createClient } from "@supabase/supabase-js";

// PHOTOAUTOMAT booth-fleet data access. Server-side only — the service-role
// key must never reach the browser. Tables live in the shared Supabase
// project, prefixed pb_ (see cloud/supabase/schema.sql in the monorepo root).
export function db() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

export const ONLINE_WINDOW_MS = 2 * 60 * 1000; // heartbeat every 60s → 2 min grace

export function boothStatus(booth) {
  const seen = booth.last_seen_at ? new Date(booth.last_seen_at).getTime() : 0;
  if (Date.now() - seen > ONLINE_WINDOW_MS) return "offline";
  const hb = booth.last_heartbeat || {};
  if (hb.state === "ERROR") return "error";
  if (hb.printer && hb.printer.ok === false) return "warning";
  if (hb.payment_connected === false) return "warning";
  return "online";
}

export const STATUS_COLOR = {
  online: "#1db954",
  warning: "#e6a700",
  error: "#d62828",
  offline: "#bcbcbc",
};
