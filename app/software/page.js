import "../dashboard/pb.css";
import LeadForm from "./lead-form";

export const metadata = {
  title: "PHOTOAUTOMAT — SOFTWARE",
  description:
    "Unattended photo booth software with card payments, live fleet dashboard and revenue analytics. Built and proven on 9 booths in Budapest. Pilot program open.",
};

// Honest framing: this is a pilot program with hands-on onboarding, not a
// self-serve download. Copy must only promise what exists today — see the
// buyer-journey audit before loosening any wording here.

const FEATURES = [
  ["UNATTENDED BY DESIGN", "Built for 24/7 coin-op kiosks, not events. Crash screens, auto-recovery, self-healing payment — proven on the Budapest fleet."],
  ["CARD PAYMENTS", "Native Nayax VPOS integration over MDB (QIBIXX). Auth-first tap: customer taps, booth shoots, money settles only when the print is in their hand."],
  ["LIVE FLEET DASHBOARD", "Every booth on one page from your phone: online status, printer paper/jam/offline flags, state, disk, uptime. 60-second heartbeat."],
  ["REVENUE ANALYTICS", "Per-booth daily revenue, sessions, 30-day leaderboard. Export-ready numbers for landlords and partners."],
  ["LIVE ERROR FEED", "Every failure streams to the dashboard with the exact error and a log excerpt. No remote desktop, no log hunting."],
  ["REMOTE CONTROL †", "Push price and settings changes, restart the app, trigger a test print — all without visiting the booth."],
  ["QR PHOTO DELIVERY †", "Guests scan a QR on the booth and download their strip from a branded page. Prints and pixels."],
  ["CANON + DNP", "Canon DSLR via EDSDK (live view, real shutter), DNP dye-sub printing with bleed-correct layout. Analog-style film filters."],
];

const HARDWARE = [
  ["CAMERA", "Canon EOS 2000D", "The hardware-proven model. Other EDSDK-supported Canon EOS bodies on request — ask before buying."],
  ["PRINTER", "DNP DS-RX1HS or DS620A", "6×4\" dye-sub media. Must be installed in Windows under its exact driver name."],
  ["PAYMENT", "Nayax VPOS Touch + QIBIXX MDB-USB", "Firmware ≥ 3.1.4. Your Nayax merchant account must be provisioned MDB Level 1 with Transaction-Start-Method: Accept-All — we give you the exact checklist to send your Nayax rep."],
  ["PC / OS", "Windows 10/11 64-bit mini-PC", "Internet required for activation and the dashboard (30-day offline grace)."],
];

export default function Software() {
  const S = {
    hero: { padding: "90px 0 70px", borderBottom: "1px solid #000" },
    h1: { fontSize: "clamp(28px, 6vw, 56px)", fontWeight: 600, letterSpacing: "0.08em",
      textTransform: "uppercase", margin: 0, lineHeight: 1.1 },
    lede: { fontFamily: "var(--pbd-mono)", fontSize: 14, color: "#666",
      maxWidth: 560, marginTop: 24, lineHeight: 1.7 },
  };
  return (
    <div className="pbd">
      <div className="wrap">
        <header className="site">
          <h1><a href="/">PHOTOAUTOMAT</a></h1>
          <nav>
            <a href="#features">Features</a>
            <a href="#hardware">Hardware</a>
            <a href="#pilot">Pilot program</a>
          </nav>
        </header>

        <section style={S.hero}>
          <h1 style={S.h1}>Booth software<br />that runs the business.</h1>
          <p style={S.lede}>
            The software behind the PHOTOAUTOMAT fleet — 9 unattended booths
            in Budapest, running 24/7 on card payments. We are opening it to
            a small group of pilot operators. Onboarding is personal: we help
            you pick hardware, set up the Nayax side, and bring your first
            booth online.
          </p>
          <div className="actions" style={{ marginTop: 36 }}>
            <a className="btn" href="#pilot">Request pilot access</a>
            <a className="btn" style={{ background: "transparent", color: "#000" }} href="/locations">See it running</a>
          </div>
        </section>

        <div className="section" id="features"><h2>What you get</h2></div>
        <div className="stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))" }}>
          {FEATURES.map(([t, d]) => (
            <div className="stat" key={t} style={{ padding: "22px 20px" }}>
              <div className="label" style={{ color: "#000", fontWeight: 600 }}>{t}</div>
              <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, margin: "10px 0 0" }}>{d}</p>
            </div>
          ))}
        </div>
        <p className="label" style={{ marginTop: 10 }}>
          † set up with you during onboarding — we enroll your booths on the dashboard personally.
        </p>

        <div className="section" id="hardware"><h2>What you must buy</h2>
          <span className="label">exactly this — substitutions break things</span></div>
        <div className="stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))" }}>
          {HARDWARE.map(([k, v, d]) => (
            <div className="stat" key={k} style={{ padding: "22px 20px" }}>
              <div className="label">{k}</div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 500, margin: "8px 0" }}>{v}</div>
              <p style={{ fontSize: 12.5, color: "#666", lineHeight: 1.6, margin: 0 }}>{d}</p>
            </div>
          ))}
        </div>

        <div className="section"><h2>Pilot terms</h2></div>
        <div className="panel">
          <p style={{ fontSize: 13, color: "#666", lineHeight: 1.8, margin: 0, maxWidth: 640 }}>
            Pilot operators get the full software, the fleet dashboard, and
            direct support from the people who run the Budapest fleet. Target
            pricing after the pilot is <span className="mono">€39 / booth / month</span>;
            pilot pricing is agreed individually. We onboard personally and
            reply within 2 business days. No self-serve download yet — that is
            deliberate: an unattended booth that takes money has to be set up
            right the first time.
          </p>
        </div>

        <div className="section"><h2>Proof</h2></div>
        <p className="mono" style={{ fontSize: 13, color: "#666", lineHeight: 1.8, maxWidth: 620 }}>
          This is not demo-ware. The same build runs the PHOTOAUTOMAT booths at
          Baross, Kazinczy, Wesselényi, Gozsdu, Dob, Westend, Király, Nyugati
          and Madách — unattended, card-only, every day.
        </p>

        <div className="section" id="pilot"><h2>Request pilot access</h2>
          <span className="label">first reply within 2 business days</span></div>
        <LeadForm />

        <footer style={{ marginTop: 80, paddingTop: 24, borderTop: "1px solid #000" }}>
          <span className="label">
            PHOTOAUTOMAT · BUDAPEST · <a href="mailto:info@photoautomat.hu">INFO@PHOTOAUTOMAT.HU</a>
          </span>
        </footer>
      </div>
    </div>
  );
}
