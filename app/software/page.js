import "../dashboard/pb.css";

export const metadata = {
  title: "PHOTOAUTOMAT — SOFTWARE",
  description:
    "Unattended photo booth software with card payments, live fleet dashboard and revenue analytics. Built and proven on 9 booths in Budapest.",
};

const FEATURES = [
  ["UNATTENDED BY DESIGN", "Built for 24/7 coin-op kiosks, not events. Crash screens, auto-recovery, self-healing payment — proven on the Budapest fleet."],
  ["CARD PAYMENTS", "Native Nayax VPOS integration over MDB (QIBIXX). Auth-first tap: customer taps, booth shoots, money settles only when the print is in their hand."],
  ["LIVE FLEET DASHBOARD", "Every booth on one page from your phone: online status, printer paper/jam/offline flags, state, disk, uptime. 60-second heartbeat."],
  ["REVENUE ANALYTICS", "Per-booth daily revenue, sessions, 30-day leaderboard. Export-ready numbers for landlords and partners."],
  ["LIVE ERROR FEED", "Every failure streams to the dashboard with the exact error and a log excerpt. No remote desktop, no log hunting."],
  ["REMOTE CONTROL", "Push price and settings changes, restart the app, trigger a test print — all without visiting the booth."],
  ["QR PHOTO DELIVERY", "Guests scan a QR on the booth and download their strip from a branded page. Prints and pixels."],
  ["CANON + DNP", "Canon DSLR via EDSDK (live view, real shutter), DNP dye-sub printing with bleed-correct layout. Analog-style film filters."],
];

const TIERS = [
  ["TRIAL", "Free", "30 days, full features", "Try it on your hardware"],
  ["PRO", "€39 / month", "per booth", "Everything. Fleet dashboard, payments, QR delivery, remote control, updates."],
  ["FLEET", "talk to us", "5+ booths or franchise", "Volume pricing, partner dashboards for your operators, white-label options."],
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
            <a href="#pricing">Pricing</a>
            <a href="mailto:info@photoautomat.hu">Contact</a>
          </nav>
        </header>

        <section style={S.hero}>
          <h1 style={S.h1}>Booth software<br />that runs the business.</h1>
          <p style={S.lede}>
            The software behind the PHOTOAUTOMAT fleet — 9 unattended booths
            in Budapest, running 24/7 on card payments. Now licensed to
            operators who want machines that earn while they sleep.
          </p>
          <div className="actions" style={{ marginTop: 36 }}>
            <a className="btn" href="mailto:info@photoautomat.hu?subject=PHOTOAUTOMAT software trial">Request a trial</a>
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

        <div className="section" id="pricing"><h2>Pricing</h2>
          <span className="label">per booth · cancel anytime</span></div>
        <div className="stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {TIERS.map(([name, price, unit, desc]) => (
            <div className="stat" key={name} style={{ padding: "26px 22px" }}>
              <div className="label" style={{ color: "#000", fontWeight: 600 }}>{name}</div>
              <div className="big" style={{ margin: "10px 0 2px" }}>{price}</div>
              <div className="label">{unit}</div>
              <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, margin: "14px 0 0" }}>{desc}</p>
            </div>
          ))}
        </div>

        <div className="section"><h2>Hardware we speak</h2></div>
        <p className="mono" style={{ fontSize: 13, color: "#666", lineHeight: 2 }}>
          CANON EOS (EDSDK) · DNP DS-RX1 / DS620 · NAYAX VPOS TOUCH · QIBIXX MDB-USB · WINDOWS 10/11
        </p>

        <div className="section"><h2>Proof</h2></div>
        <p className="mono" style={{ fontSize: 13, color: "#666", lineHeight: 1.8, maxWidth: 620 }}>
          This is not demo-ware. The same build runs the PHOTOAUTOMAT booths at
          Baross, Kazinczy, Wesselényi, Gozsdu, Dob, Westend, Király, Nyugati
          and Madách — unattended, card-only, every day.
        </p>

        <footer style={{ marginTop: 80, paddingTop: 24, borderTop: "1px solid #000" }}>
          <span className="label">
            PHOTOAUTOMAT · BUDAPEST · <a href="mailto:info@photoautomat.hu">INFO@PHOTOAUTOMAT.HU</a>
          </span>
        </footer>
      </div>
    </div>
  );
}
