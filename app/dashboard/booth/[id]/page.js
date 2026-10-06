import {
  db, boothStatus, STATUS_COLOR, STATUS_LABEL, BOOTH_PHOTOS,
  fmtFt, fmtTime, timeAgo, daysBack,
} from "@/lib/pb";
import { BarChart } from "@/lib/spark";
import AutoRefresh from "../../refresh";
import { sendCommand, saveRemoteConfig, generatePairingCode, uploadOverlay, removeOverlay } from "./actions";

export const dynamic = "force-dynamic";

const HB_COLOR = { IDLE: "#1db954", SHOOTING: "#000", PRINTING: "#666", ERROR: "#d62828", OPERATOR: "#e6a700" };

export default async function Booth({ params }) {
  const { id } = await params;
  const sb = db();
  const { data: booth } = await sb.from("pb_booths").select("*").eq("id", id).single();
  if (!booth) return <div className="empty">Booth not found</div>;

  const since24h = new Date(Date.now() - 86400_000).toISOString();
  const [{ data: events }, { data: revenue }, { data: beats }, { data: pending }, { data: paircode }] = await Promise.all([
    sb.from("pb_events").select("*").eq("booth_id", booth.id)
      .order("occurred_at", { ascending: false }).limit(120),
    sb.from("pb_daily_revenue").select("*").eq("booth_id", booth.id)
      .gte("day", daysBack(14)).order("day"),
    sb.from("pb_heartbeats").select("created_at,payload").eq("booth_id", booth.id)
      .gte("created_at", since24h).order("created_at").limit(1440),
    sb.from("pb_commands").select("*").eq("booth_id", booth.id)
      .eq("status", "pending"),
    sb.from("pb_pairing_codes").select("*").eq("booth_id", booth.id)
      .is("used_at", null).gte("expires_at", new Date().toISOString()).maybeSingle(),
  ]);

  const st = boothStatus(booth);
  const hb = booth.last_heartbeat || {};
  const rc = booth.remote_config || {};
  const photo = BOOTH_PHOTOS[booth.kabin_id];
  const days = (revenue || []).map((r) => r.day);
  const vals = (revenue || []).map((r) => r.revenue_huf);
  const sendCmd = sendCommand.bind(null, booth.id);
  const saveCfg = saveRemoteConfig.bind(null, booth.id);

  return (
    <main>
      <AutoRefresh />
      <div className="photo" style={{ height: 160, marginBottom: 24, border: "1px solid #000" }}>
        {photo ? <img src={photo} alt="" /> : <div className="mono-letter">{(booth.name || "?")[0]}</div>}
        <div className="overlay" style={{ fontSize: 16 }}>
          <span className="dot" style={{ background: STATUS_COLOR[st] }} />
          {booth.name || booth.kabin_id}
          <span className="loc">{booth.location} · {STATUS_LABEL[st]} · last seen {timeAgo(booth.last_seen_at)}</span>
        </div>
      </div>

      <div className="health">
        <div><div className="label">State</div><div className="v">{hb.state || "—"}</div></div>
        <div><div className="label">Payment</div>
          <div className={`v ${hb.payment_connected === false ? "bad" : ""}`}>
            {hb.payment_connected == null ? "—" : hb.payment_connected ? "CONNECTED" : "DISCONNECTED"}</div></div>
        <div><div className="label">Printer</div>
          <div className={`v ${hb.printer && hb.printer.ok === false ? "bad" : ""}`}>
            {hb.printer ? (hb.printer.ok ? `OK · ${hb.printer.jobs ?? 0} jobs` : (hb.printer.issues || []).join(", ").toUpperCase()) : "—"}</div></div>
        <div><div className="label">App version</div><div className="v">{hb.version || "—"}</div></div>
        <div><div className="label">Uptime</div>
          <div className="v">{hb.uptime_s != null ? `${Math.floor(hb.uptime_s / 3600)}h ${Math.floor((hb.uptime_s % 3600) / 60)}m` : "—"}</div></div>
        <div><div className="label">Disk free</div>
          <div className="v">{hb.disk_free_mb != null ? `${(hb.disk_free_mb / 1024).toFixed(1)} GB` : "—"}</div></div>
      </div>

      <div className="section"><h2>Setup &amp; pairing</h2>
        <span className="label">one-time — pairs a fresh install to this booth</span></div>
      <div className="panel">
        <div className="panel-grid">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Pairing code</div>
            {paircode ? (
              <>
                <div className="keybox" style={{ fontSize: 26, letterSpacing: "0.3em", textAlign: "center" }}>
                  {paircode.code}
                </div>
                <div className="label">
                  plan: {paircode.plan} · expires {fmtTime(paircode.expires_at)} — type it on the
                  booth&apos;s first-run screen
                </div>
              </>
            ) : (
              <form className="inline" action={generatePairingCode.bind(null, booth.id)}>
                <div className="field"><span className="label">License plan</span>
                  <select name="plan" defaultValue="pro">
                    <option value="pro">PRO</option>
                    <option value="trial">TRIAL (30 days)</option>
                    <option value="event_pass">EVENT PASS (24h)</option>
                  </select></div>
                <button>Generate code</button>
              </form>
            )}
          </div>
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Print overlay / template (PNG, print size, transparent where photos show)</div>
            <form className="inline" action={uploadOverlay.bind(null, booth.id)}>
              <input type="file" name="overlay" accept="image/png" style={{ border: "1px solid #000", padding: 8 }} />
              <button>Push to booth</button>
            </form>
            {rc.overlay_ver ? (
              <form action={removeOverlay.bind(null, booth.id)} style={{ marginTop: 10 }}>
                <span className="label">active overlay v{rc.overlay_ver} · </span>
                <button className="ghost">Remove overlay</button>
              </form>
            ) : (
              <div className="label" style={{ marginTop: 10 }}>no overlay — booth prints the standard layout</div>
            )}
          </div>
        </div>
      </div>

      <div className="section"><h2>Remote control</h2>
        <span className="label">{(pending || []).length > 0 ? `${pending.length} command(s) queued — delivered on next heartbeat` : ""}</span>
      </div>
      <div className="panel">
        <div className="panel-grid">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Actions</div>
            <div className="actions">
              <form action={sendCmd.bind(null, "restart")}><button className="danger">Restart app</button></form>
              <form action={sendCmd.bind(null, "test_print")}><button className="ghost">Test print</button></form>
            </div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Config push (applied on next heartbeat)</div>
            <form className="inline" action={saveCfg}>
              <div className="field"><span className="label">Price (Ft)</span>
                <input name="price" type="number" defaultValue={rc["payment.price_units"] ?? 1990} style={{ width: 100 }} /></div>
              <div className="field"><span className="label">Countdown (s)</span>
                <input name="countdown" type="number" defaultValue={rc["shooting.countdown_seconds"] ?? 5} style={{ width: 80 }} /></div>
              <div className="field"><span className="label">Err auto-reset (s)</span>
                <input name="auto_reset" type="number" defaultValue={rc["error.printer_auto_reset_seconds"] ?? 300} style={{ width: 90 }} /></div>
              <div className="field"><span className="label">Print scale</span>
                <input name="p_scale" type="number" step="0.005" min="0.8" max="1.2"
                       defaultValue={rc["printer.scale"] ?? 1.0} style={{ width: 80 }} /></div>
              <div className="field"><span className="label">Offset X (px)</span>
                <input name="p_dx" type="number" min="-200" max="200"
                       defaultValue={rc["printer.offset_x_px"] ?? 0} style={{ width: 80 }} /></div>
              <div className="field"><span className="label">Offset Y (px)</span>
                <input name="p_dy" type="number" min="-200" max="200"
                       defaultValue={rc["printer.offset_y_px"] ?? 0} style={{ width: 80 }} /></div>
              <button>Push</button>
            </form>
          </div>
        </div>
      </div>

      <div className="section"><h2>State · last 24h</h2><span className="label">one block per heartbeat</span></div>
      <div className="timeline">
        {(beats || []).length === 0
          ? <span style={{ background: "#eee" }} />
          : (beats || []).map((b, i) => (
              <span key={i} style={{ background: HB_COLOR[b.payload?.state] || "#bcbcbc" }}
                    title={`${fmtTime(b.created_at)} — ${b.payload?.state || "?"}`} />
            ))}
      </div>

      <div className="section"><h2>Revenue · last 14 days</h2>
        <span className="label">{fmtFt(vals.reduce((a, b) => a + b, 0))} total</span></div>
      {vals.length > 0
        ? <BarChart labels={days} data={vals} h={120} />
        : <div className="empty">No revenue yet</div>}

      <div className="section"><h2>Event timeline</h2></div>
      <table>
        <thead><tr><th>Time</th><th>Type</th><th>Sev</th><th>Detail</th></tr></thead>
        <tbody>
          {(events || []).map((e) => (
            <tr key={e.id}>
              <td style={{ whiteSpace: "nowrap" }}>{fmtTime(e.occurred_at)}</td>
              <td>{e.type}</td>
              <td><span className={`sev ${e.severity}`}>{e.severity}</span></td>
              <td>
                {e.amount != null && <>{fmtFt(e.amount)} </>}
                {e.data?.reason && <>{e.data.reason} </>}
                {e.data?.log_tail && (
                  <details>
                    <summary className="label" style={{ cursor: "pointer" }}>log tail</summary>
                    <pre className="logtail">{e.data.log_tail}</pre>
                  </details>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
