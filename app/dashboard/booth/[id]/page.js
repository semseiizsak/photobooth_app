import { db, boothStatus, STATUS_COLOR } from "@/lib/pb";

export const dynamic = "force-dynamic";

const fmt = (ts) =>
  ts ? new Date(ts).toLocaleString("hu-HU", { timeZone: "Europe/Budapest" }) : "—";

export default async function Booth({ params }) {
  const { id } = await params;
  const sb = db();
  const { data: booth } = await sb.from("pb_booths").select("*").eq("id", id).single();
  if (!booth) return <div className="empty">Booth not found</div>;

  const [{ data: events }, { data: revenue }] = await Promise.all([
    sb.from("pb_events").select("*").eq("booth_id", booth.id)
      .order("occurred_at", { ascending: false }).limit(100),
    sb.from("pb_daily_revenue").select("*").eq("booth_id", booth.id)
      .order("day", { ascending: false }).limit(14),
  ]);

  const st = boothStatus(booth);
  const hb = booth.last_heartbeat || {};

  return (
    <main>
      <div className="section" style={{ marginTop: 0 }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="dot" style={{ background: STATUS_COLOR[st] }} />
          {booth.name || booth.kabin_id} — {st}
        </h2>
        <div className="label" style={{ marginTop: 6 }}>{booth.location} · last seen {fmt(booth.last_seen_at)}</div>
      </div>

      <div className="section"><h2>Health</h2></div>
      <table>
        <tbody>
          <tr><td className="sans label">State</td><td>{hb.state || "—"}</td></tr>
          <tr><td className="sans label">App version</td><td>{hb.version || "—"}</td></tr>
          <tr><td className="sans label">Payment terminal</td>
              <td>{hb.payment_connected == null ? "—" : hb.payment_connected ? "CONNECTED" : "DISCONNECTED"}</td></tr>
          <tr><td className="sans label">Printer</td>
              <td>{hb.printer ? (hb.printer.ok ? `OK · ${hb.printer.jobs ?? 0} jobs queued`
                   : (hb.printer.issues || []).join(", ").toUpperCase()) : "—"}</td></tr>
          <tr><td className="sans label">Uptime</td>
              <td>{hb.uptime_s != null ? `${Math.floor(hb.uptime_s / 3600)}h ${Math.floor((hb.uptime_s % 3600) / 60)}m` : "—"}</td></tr>
          <tr><td className="sans label">Disk free</td>
              <td>{hb.disk_free_mb != null ? `${(hb.disk_free_mb / 1024).toFixed(1)} GB` : "—"}</td></tr>
        </tbody>
      </table>

      <div className="section"><h2>Revenue — last 14 days</h2></div>
      <table>
        <thead><tr><th>Day</th><th>Sessions</th><th>Revenue</th></tr></thead>
        <tbody>
          {(revenue || []).map((r) => (
            <tr key={r.day}>
              <td>{r.day}</td>
              <td>{r.sessions}</td>
              <td>Ft {r.revenue_huf.toLocaleString("hu-HU")}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="section"><h2>Event timeline</h2></div>
      <table>
        <thead><tr><th>Time</th><th>Type</th><th>Sev</th><th>Detail</th></tr></thead>
        <tbody>
          {(events || []).map((e) => (
            <tr key={e.id}>
              <td style={{ whiteSpace: "nowrap" }}>{fmt(e.occurred_at)}</td>
              <td>{e.type}</td>
              <td><span className={`sev ${e.severity}`}>{e.severity}</span></td>
              <td>
                {e.amount != null && <>Ft {e.amount.toLocaleString("hu-HU")} </>}
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
