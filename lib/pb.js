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

export const STATUS_LABEL = {
  online: "ONLINE",
  warning: "ATTENTION",
  error: "ERROR",
  offline: "OFFLINE",
};

// Booth photos shipped with the site (public/). Missing ones fall back to a
// black monogram block in the UI.
export const BOOTH_PHOTOS = {
  dob: "/dob.jpg",
  gozsdu: "/gozsdu.jpg",
  kiraly: "/kiraly.jpg",
  madach: "/madach.jpg",
  nyugati: "/nyugati.jpg",
  westend: "/westend.jpg",
};

export const fmtFt = (n) => `Ft ${Number(n || 0).toLocaleString("hu-HU")}`;

export const fmtTime = (ts) =>
  ts ? new Date(ts).toLocaleString("hu-HU", { timeZone: "Europe/Budapest" }) : "—";

export function timeAgo(ts) {
  if (!ts) return "never";
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function todayBudapest() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Budapest" });
}

export function daysBack(n) {
  return new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10);
}

// Last-N-days revenue array for one booth from pb_daily_revenue rows.
export function seriesFor(rows, boothId, days = 7) {
  const byDay = {};
  for (const r of rows || [])
    if (r.booth_id === boothId) byDay[r.day] = r.revenue_huf;
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000)
      .toLocaleDateString("sv-SE", { timeZone: "Europe/Budapest" });
    out.push(byDay[d] || 0);
  }
  return out;
}
