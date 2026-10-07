import { NextResponse } from "next/server";
import { db } from "@/lib/pb";

export const dynamic = "force-dynamic";

// Public lead capture for the /software pilot program. Honeypot field +
// length caps keep casual bots out; leads land in pb_leads and are reviewed
// on /dashboard/leads.
export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  if (body.website) return NextResponse.json({ ok: true }); // honeypot — pretend success

  const name = String(body.name || "").trim().slice(0, 120);
  const email = String(body.email || "").trim().slice(0, 200);
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return NextResponse.json({ error: "name and valid email required" }, { status: 400 });

  const { error } = await db().from("pb_leads").insert({
    name,
    email,
    country: String(body.country || "").slice(0, 80),
    booths: String(body.booths || "").slice(0, 80),
    hardware: String(body.hardware || "").slice(0, 300),
    message: String(body.message || "").slice(0, 2000),
  });
  if (error) return NextResponse.json({ error: "could not save" }, { status: 500 });

  // Heads-up to the owner (best-effort; the lead is already saved)
  try {
    const { sendEmail, brandEmail } = await import("@/lib/email");
    const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    await sendEmail({
      to: "info@photoautomat.hu",
      replyTo: email,
      subject: `New pilot request — ${name}`,
      html: brandEmail({
        heading: "New pilot request",
        bodyHtml: `<p><b>${esc(name)}</b> · ${esc(email)}<br/>${esc(body.country)} · ${esc(body.booths)}</p>
          <p>${esc(body.hardware)}</p><p>${esc(body.message)}</p>
          <p><a href="https://www.photoautomat.hu/dashboard/leads">Open Leads</a></p>`,
      }),
    });
  } catch { /* never fail the lead */ }

  return NextResponse.json({ ok: true });
}
