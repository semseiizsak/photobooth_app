import { sendEmail, brandEmail } from "@/lib/email";

// Proactive problem alerts. Swept at most once per minute, piggybacking on
// booth heartbeats (fleet-wide: any booth's heartbeat sweeps all booths) with
// the daily cron as a fallback. Emails fire on the inactive→active
// transition of each (booth, kind); offline re-sends every 24h while it
// lasts and sends a recovery note when the booth returns.
//
// Kinds: offline (no heartbeat 5+ min) · error (booth state ERROR)
//        printer (driver reports jam/out/offline) · paper_low (≤10% left)

const OFFLINE_AFTER_MS = 5 * 60 * 1000;
const RESEND_OFFLINE_MS = 24 * 3600 * 1000;
const SWEEP_EVERY_MS = 60 * 1000;

const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function describe(kind, booth, ctx) {
  const name = booth.name || booth.kabin_id;
  switch (kind) {
    case "offline":
      return {
        subject: `⚠ ${name} is OFFLINE`,
        heading: `${name} is offline`,
        body: `<p>No heartbeat since <b>${esc(ctx.lastSeen)}</b>. The booth is not
          reporting — power, Windows, or internet is down. Guests may be
          standing in front of a dead screen.</p>`,
      };
    case "error":
      return {
        subject: `⚠ ${name} is in ERROR state`,
        heading: `${name} needs attention`,
        body: `<p>The booth is showing its error screen. The error feed on the
          dashboard has the exact reason and a log excerpt.</p>`,
      };
    case "printer":
      return {
        subject: `⚠ ${name}: printer ${esc(ctx.issues)}`,
        heading: `${name} — printer problem`,
        body: `<p>The printer driver reports: <b>${esc(ctx.issues)}</b>.
          Until it is fixed the booth cannot deliver prints.</p>`,
      };
    case "paper_low":
      return {
        subject: `▤ ${name}: ~${ctx.remaining} prints of paper left`,
        heading: `${name} — paper is running low`,
        body: `<p>About <b>${ctx.remaining}</b> sheets remain
          (${ctx.pct}% of a ${booth.paper_capacity}-sheet roll). Plan a refill —
          press <b>Paper reloaded</b> on the booth's dashboard page after
          changing the media.</p>`,
      };
    case "offline_recovered":
      return {
        subject: `✓ ${name} is back online`,
        heading: `${name} recovered`,
        body: `<p>The booth is reporting again and back in business.</p>`,
      };
    default:
      return { subject: name, heading: name, body: "" };
  }
}

async function notify(kind, booth, org, ctx) {
  const d = describe(kind, booth, ctx);
  const to = [process.env.ALERT_EMAIL || "info@photoautomat.hu"];
  if (org?.email && !to.includes(org.email)) to.push(org.email);
  const link = booth.org_id && org?.slug
    ? `https://www.photoautomat.hu/org/${org.slug}`
    : `https://www.photoautomat.hu/dashboard/booth/${booth.id}`;
  await sendEmail({
    to,
    subject: d.subject,
    html: brandEmail({
      heading: d.heading,
      bodyHtml: `${d.body}<p><a href="${link}">Open the dashboard</a> ·
        ${esc(booth.location || "")}</p>`,
    }),
  });
}

export async function runAlertSweep(sb) {
  const now = Date.now();

  // Fleet-wide throttle so 9 booths' heartbeats don't sweep 9× a minute
  const { data: lock } = await sb.from("pb_settings").select("value")
    .eq("key", "alert_sweep").maybeSingle();
  if (lock?.value?.last && now - lock.value.last < SWEEP_EVERY_MS) return;
  await sb.from("pb_settings").upsert({ key: "alert_sweep", value: { last: now } });

  const [{ data: booths }, { data: orgs }, { data: paper }, { data: states }] =
    await Promise.all([
      sb.from("pb_booths").select("*").not("last_seen_at", "is", null),
      sb.from("pb_organizations").select("id,slug,email"),
      sb.from("pb_paper_used").select("*"),
      sb.from("pb_alert_state").select("*"),
    ]);

  const orgById = Object.fromEntries((orgs || []).map((o) => [o.id, o]));
  const usedBy = Object.fromEntries((paper || []).map((p) => [p.booth_id, p.used]));
  const stateOf = {};
  for (const s of states || []) stateOf[`${s.booth_id}:${s.kind}`] = s;

  for (const b of booths || []) {
    const org = b.org_id ? orgById[b.org_id] : null;
    const hb = b.last_heartbeat || {};
    const lastSeenMs = new Date(b.last_seen_at).getTime();
    const offline = now - lastSeenMs > OFFLINE_AFTER_MS;

    const used = usedBy[b.id] ?? 0;
    const remaining = Math.max(0, (b.paper_capacity || 700) - used);
    const ratio = (b.paper_capacity || 700) > 0 ? remaining / (b.paper_capacity || 700) : 1;

    const conditions = {
      offline,
      // state conditions only mean something while the booth reports
      error: !offline && hb.state === "ERROR",
      printer: !offline && !!(hb.printer && hb.printer.ok === false),
      paper_low: b.paper_loaded_at != null && ratio <= 0.1,
    };

    for (const [kind, isActive] of Object.entries(conditions)) {
      const st = stateOf[`${b.id}:${kind}`];
      const wasActive = st?.active === true;
      const ctx = {
        lastSeen: new Date(b.last_seen_at).toLocaleString("hu-HU", { timeZone: "Europe/Budapest" }),
        issues: (hb.printer?.issues || []).join(", ") || "error",
        remaining,
        pct: Math.round(ratio * 100),
      };

      if (isActive && !wasActive) {
        await notify(kind, b, org, ctx);
        await sb.from("pb_alert_state").upsert({
          booth_id: b.id, kind, active: true,
          last_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else if (isActive && wasActive && kind === "offline"
                 && st.last_sent_at
                 && now - new Date(st.last_sent_at).getTime() > RESEND_OFFLINE_MS) {
        await notify(kind, b, org, ctx);
        await sb.from("pb_alert_state").upsert({
          booth_id: b.id, kind, active: true,
          last_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else if (!isActive && wasActive) {
        // paper clears only after a real reload (back above half a roll)
        if (kind === "paper_low" && ratio <= 0.5) continue;
        if (kind === "offline") await notify("offline_recovered", b, org, ctx);
        await sb.from("pb_alert_state").upsert({
          booth_id: b.id, kind, active: false,
          last_sent_at: st?.last_sent_at || null,
          updated_at: new Date().toISOString(),
        });
      }
    }
  }
}
