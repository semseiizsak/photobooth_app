// Transactional email via Resend's REST API (no SDK needed).
// Inactive until RESEND_API_KEY is set in Vercel. RESEND_FROM must be an
// address on a domain verified in the Resend dashboard (photoautomat.hu).
export async function sendEmail({ to, subject, html, replyTo }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: "RESEND_API_KEY not set" };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "PHOTOAUTOMAT <info@photoautomat.hu>",
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    const body = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, id: body.id, error: body.message };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Black-and-white brand email shell, table-based for mail clients.
export function brandEmail({ heading, bodyHtml }) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #000;">
<tr><td style="background:#000;color:#fff;padding:20px 28px;font-family:Arial,Helvetica,sans-serif;
  font-size:14px;font-weight:bold;letter-spacing:4px;">PHOTOAUTOMAT</td></tr>
<tr><td style="padding:28px;font-family:Arial,Helvetica,sans-serif;color:#000;">
<div style="font-size:18px;font-weight:bold;letter-spacing:1px;margin-bottom:16px;">${esc(heading)}</div>
<div style="font-size:14px;line-height:1.7;color:#333;">${bodyHtml}</div>
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #e5e5e5;font-family:Arial,Helvetica,sans-serif;
  font-size:11px;letter-spacing:2px;color:#999;">PHOTOAUTOMAT · BUDAPEST ·
  <a href="mailto:info@photoautomat.hu" style="color:#999;">INFO@PHOTOAUTOMAT.HU</a></td></tr>
</table></td></tr></table></body></html>`;
}

export function welcomeEmail({ orgName, slug, accessCode, downloadUrl }) {
  const dash = `https://www.photoautomat.hu/org/${slug}`;
  const row = (k, v) =>
    `<tr><td style="padding:8px 12px;border:1px solid #e5e5e5;font-size:11px;letter-spacing:1px;color:#666;">${k}</td>
     <td style="padding:8px 12px;border:1px solid #e5e5e5;font-family:Courier,monospace;font-size:13px;">${v}</td></tr>`;
  return brandEmail({
    heading: `Welcome, ${orgName}`,
    bodyHtml: `
<p>Your PHOTOAUTOMAT software subscription is active. Everything you need:</p>
<table cellpadding="0" cellspacing="0" style="margin:16px 0;border-collapse:collapse;">
${row("YOUR DASHBOARD", `<a href="${dash}">${esc(dash)}</a>`)}
${row("ACCESS CODE", esc(accessCode))}
${row("DOWNLOAD", downloadUrl
  ? `<a href="${esc(downloadUrl)}">PhotoBooth_Setup.exe</a>`
  : "sent separately during onboarding")}
</table>
<p><b>Do this first (it takes days, not minutes):</b> your Nayax VPOS must be
provisioned by your Nayax rep with <b>MDB Level 1</b> and
<b>Transaction Start Method: Accept-All</b>. Forward them the checklist in the
<a href="https://www.photoautomat.hu/docs/quickstart">Quickstart</a>.</p>
<p>Then: connect the hardware per the
<a href="https://www.photoautomat.hu/docs/hardware">Hardware guide</a>, run the
installer, and when the app asks for a code, open your dashboard above — each
booth has a <b>Generate pairing code</b> button. Type the 6 digits on the booth
and it comes online, licensed and visible on your dashboard, by itself.</p>
<p>Stuck anywhere? Reply to this email — a human who runs the Budapest fleet
answers within 2 business days.</p>`,
  });
}
