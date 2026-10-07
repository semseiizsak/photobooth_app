import "../dashboard/pb.css";
import { db } from "@/lib/pb";

export const dynamic = "force-dynamic";
export const metadata = { title: "PHOTOAUTOMAT — WELCOME" };

// Stripe checkout success page (success_url = /welcome?session_id={CHECKOUT_SESSION_ID}).
// Verifies the session with Stripe server-side, looks up the org the webhook
// provisioned, and shows everything the buyer needs — the same content as the
// welcome email, so nothing is lost to a spam folder.
export default async function Welcome({ searchParams }) {
  const { session_id } = await searchParams;
  let org = null;
  let state = "invalid"; // invalid | provisioning | ready

  if (session_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const { default: Stripe } = await import("stripe");
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(session_id);
      if (session && (session.payment_status === "paid" || session.status === "complete")) {
        const { data } = await db().from("pb_organizations").select("*")
          .eq("stripe_subscription_id", session.subscription).maybeSingle();
        org = data;
        state = org ? "ready" : "provisioning";
      }
    } catch { /* stays invalid */ }
  }

  const Row = ({ k, children }) => (
    <tr><td className="sans label" style={{ whiteSpace: "nowrap" }}>{k}</td><td>{children}</td></tr>
  );

  return (
    <div className="pbd">
      <div className="wrap" style={{ maxWidth: 720 }}>
        <header className="site"><h1>PHOTOAUTOMAT</h1>
          <nav><a href="/docs">Docs</a><a href="mailto:info@photoautomat.hu">Support</a></nav>
        </header>

        {state === "invalid" && (
          <main>
            <div className="section" style={{ marginTop: 0 }}><h2>Welcome</h2></div>
            <p className="sans" style={{ fontSize: 14, lineHeight: 1.8, color: "#333" }}>
              We couldn&apos;t verify this checkout link. If you just paid, use the
              link in your welcome email — or write to info@photoautomat.hu and
              a human will sort it out.
            </p>
          </main>
        )}

        {state === "provisioning" && (
          <main>
            <meta httpEquiv="refresh" content="5" />
            <div className="section" style={{ marginTop: 0 }}><h2>Payment received — setting up…</h2></div>
            <p className="sans" style={{ fontSize: 14, lineHeight: 1.8, color: "#333" }}>
              Your dashboard is being created. This page refreshes itself —
              give it a few seconds.
            </p>
          </main>
        )}

        {state === "ready" && (
          <main>
            <div className="section" style={{ marginTop: 0 }}>
              <h2>Welcome, {org.name} — you&apos;re in business</h2></div>
            <div className="panel">
              <table>
                <tbody>
                  <Row k="Your dashboard">
                    <a href={`/org/${org.slug}`} style={{ textDecoration: "underline" }}>
                      www.photoautomat.hu/org/{org.slug}</a>
                  </Row>
                  <Row k="Access code">{org.access_code}</Row>
                  <Row k="Login">any username + the access code</Row>
                </tbody>
              </table>
              <p className="label" style={{ marginTop: 14 }}>
                Save this page — the same details are in your welcome email.
              </p>
            </div>

            <div className="section"><h2>Your next steps, in order</h2></div>
            <div className="panel">
              <ol style={{ fontSize: 13.5, lineHeight: 2, color: "#333", paddingLeft: 20, margin: 0 }}>
                <li><b>Start the Nayax paperwork today</b> — it takes days. Forward the
                  checklist in the <a href="/docs/quickstart" style={{ textDecoration: "underline" }}>Quickstart</a> to
                  your Nayax rep (MDB Level 1 + Transaction Start Method: Accept-All).</li>
                <li>Buy/connect hardware per the <a href="/docs/hardware" style={{ textDecoration: "underline" }}>Hardware guide</a>.</li>
                <li>Install the booth software on the booth PC (download link in your email).</li>
                <li>On your <a href={`/org/${org.slug}`} style={{ textDecoration: "underline" }}>dashboard</a>,
                  press <b>Generate pairing code</b> on a booth and type the 6 digits on the booth screen.
                  It comes online, licensed, by itself.</li>
              </ol>
            </div>
            <p className="label">
              Questions at any step: reply to the welcome email or info@photoautomat.hu — first reply within 2 business days.
            </p>
          </main>
        )}
      </div>
    </div>
  );
}
