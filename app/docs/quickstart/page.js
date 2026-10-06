export const metadata = { title: "PHOTOAUTOMAT — QUICKSTART" };

const H = ({ children }) => <div className="section"><h2>{children}</h2></div>;
const P = ({ children }) => (
  <p style={{ fontSize: 13.5, color: "#333", lineHeight: 1.8, maxWidth: 680, margin: "0 0 12px" }}>{children}</p>
);
const LI = ({ children }) => (
  <li style={{ fontSize: 13.5, color: "#333", lineHeight: 1.8, marginBottom: 8 }}>{children}</li>
);

export default function Quickstart() {
  return (
    <main>
      <div className="section" style={{ marginTop: 0 }}><h2>Quickstart — boxes to banknotes</h2>
        <span className="label">follow in order</span></div>
      <P>This takes you from hardware on a table to a booth that takes card
        payments and prints. Support: info@photoautomat.hu — we reply within
        2 business days.</P>

      <H>1 · Start the Nayax paperwork FIRST (days, not minutes)</H>
      <P>Your Nayax VPOS must be provisioned by Nayax or your distributor with:</P>
      <ul>
        <LI><b>MDB protocol, Level 1</b> — the booth acts as the vending machine</LI>
        <LI><b>Transaction Start Method: Accept-All</b> — the terminal pre-authorizes a tap before the booth requests the amount</LI>
        <LI>Currency with <b>0 decimal places</b> for HUF</LI>
      </ul>
      <P>Send that list to your Nayax rep verbatim. Without Accept-All, taps do
        nothing — this is the #1 setup failure, which is why it is step 1.</P>

      <H>2 · Windows setup</H>
      <ul>
        <LI>One standard user, auto-login at boot; sleep/hibernate disabled, High-performance power plan</LI>
        <LI>Install the DNP printer driver; the booth lists printers by their exact Windows name</LI>
        <LI>Never install EOS Utility / DSLR Remote Pro / digiCamControl on this machine — they take exclusive USB access to the camera</LI>
      </ul>

      <H>3 · Connect the hardware</H>
      <ul>
        <LI>Camera: USB, mode dial M, lens cap off. No SD card needed — shots download to the PC</LI>
        <LI>Printer: USB + power, media loaded</LI>
        <LI>QIBIXX: USB to the PC (found automatically on COM1–20); MDB cable to the Nayax</LI>
        <LI>Nayax: powered via MDB. After a cold start it can take ~2 minutes to come online — "out of order" during that time is normal</LI>
      </ul>

      <H>4 · Install and pair</H>
      <ul>
        <LI>Run PhotoBooth_Setup.exe (link comes with your onboarding). If SmartScreen warns: More info → Run anyway</LI>
        <LI>The setup wizard finds the QIBIXX, lists your printers and asks your price</LI>
        <LI>The pairing screen asks for a <b>6-digit code</b>: we generate it in the dashboard during onboarding (or you do, on your booth&apos;s page → Generate code). Typing it links the booth to the dashboard and activates the license — nothing else to configure</LI>
      </ul>

      <H>5 · First test</H>
      <ul>
        <LI>The startup screen self-tests camera, printer and payment — all three must go green</LI>
        <LI>Tap a card: countdown → 4 photos → print. The charge settles only after the print</LI>
        <LI>Any failure shows the exact reason on the error screen, and lands on your dashboard&apos;s error feed with a log excerpt</LI>
      </ul>

      <H>Common failures</H>
      <table>
        <thead><tr><th>Symptom</th><th>Cause</th><th>Fix</th></tr></thead>
        <tbody>
          <tr><td className="sans">Taps do nothing / reversed</td><td className="sans">Nayax not provisioned Accept-All</td><td className="sans">Step 1 — contact your Nayax rep</td></tr>
          <tr><td className="sans">Nayax &quot;out of order&quot; &gt; 3 min</td><td className="sans">MDB re-init</td><td className="sans">Power-cycle QIBIXX USB, wait 2 min</td></tr>
          <tr><td className="sans">Print error</td><td className="sans">Printer name/driver</td><td className="sans">Exact name in the wizard; reinstall driver</td></tr>
          <tr><td className="sans">Camera not found</td><td className="sans">EOS Utility/Remote Pro running</td><td className="sans">Uninstall them; replug USB; mode dial M</td></tr>
        </tbody>
      </table>
    </main>
  );
}
