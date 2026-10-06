export const metadata = { title: "PHOTOAUTOMAT — HARDWARE" };

const ROWS = [
  ["CAMERA", "Canon EOS 2000D + kit lens + AC adapter (dummy battery)", "The hardware-proven model, driven natively via Canon EDSDK (live view + real shutter). Other Canon EOS bodies: ask before buying. No SD card needed."],
  ["PRINTER", "DNP DS-RX1HS or DS620A + 6×4\" media", "Kiosk-grade dye-sub, hundreds of prints per roll. The print pipeline is tuned for DNP's geometry."],
  ["PAYMENT", "Nayax VPOS Touch (fw ≥ 3.1.4)", "The only supported reader — integrated natively over MDB, not pulse-counting. Needs a Nayax merchant account provisioned per the Quickstart §1 checklist. Start this paperwork first."],
  ["MDB ADAPTER", "QIBIXX MDB-USB", "Bridges the PC to the Nayax. The software speaks QIBIXX's protocol specifically — no other adapter works."],
  ["PC", "Windows 10/11 64-bit mini-PC · 8 GB RAM · 128 GB+ SSD", "Intel N100-class is plenty. On 24/7: disable sleep. Wired LAN preferred."],
  ["EXTRAS", "UPS (recommended) · booth lighting", "Lighting matters more for photo quality than any camera setting."],
];

export default function Hardware() {
  return (
    <main>
      <div className="section" style={{ marginTop: 0 }}><h2>Hardware buying guide</h2>
        <span className="label">buy exactly this — substitutions break booths</span></div>
      <table>
        <thead><tr><th>Part</th><th>Buy exactly</th><th>Why</th></tr></thead>
        <tbody>
          {ROWS.map(([k, v, d]) => (
            <tr key={k}>
              <td style={{ whiteSpace: "nowrap" }}>{k}</td>
              <td className="sans" style={{ fontWeight: 600 }}>{v}</td>
              <td className="sans" style={{ color: "#666" }}>{d}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="section"><h2>Budget</h2></div>
      <p className="mono" style={{ fontSize: 13, color: "#666", lineHeight: 2 }}>
        CAMERA ~€450 · PRINTER ~€1,100 · NAYAX + QIBIXX ~€450 · PC ~€200<br />
        ≈ <b style={{ color: "#000" }}>€2,200 per booth</b> + media ~€0.20/print (excl. VAT and the booth shell)
      </p>

      <div className="section"><h2>Internet</h2></div>
      <p className="sans" style={{ fontSize: 13.5, color: "#333", lineHeight: 1.8, maxWidth: 680 }}>
        Required for activation (weekly re-check, 30-day offline grace) and the
        live dashboard. The booth keeps shooting and printing during outages;
        telemetry queues and syncs when the line returns.
      </p>
    </main>
  );
}
