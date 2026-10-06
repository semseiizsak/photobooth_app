import Link from "next/link";
import {
  db, boothStatus, STATUS_COLOR, STATUS_LABEL, BOOTH_PHOTOS,
  fmtFt, fmtTime, timeAgo, daysBack,
} from "@/lib/pb";
import { BarChart } from "@/lib/spark";
import AutoRefresh from "../../../../dashboard/refresh";

export const dynamic = "force-dynamic";

// Partner booth detail — read-only (no remote control, no config push).
export default async function OrgBooth({ params }) {
  const { slug, id } = await params;
  const sb = db();
  const { data: org } = await sb.from("pb_organizations").select("id,name").eq("slug", slug).single();
  if (!org) return <div className="empty">Unknown partner</div>;

  const { data: booth } = await sb.from("pb_booths").select("*")
    .eq("id", id).eq("org_id", org.id).single();
  if (!booth) return <div className="empty">Booth not found</div>;

  const [{ data: events }, { data: revenue }] = await Promise.all([
    sb.from("pb_events").select("*").eq("booth_id", booth.id)
      .order("occurred_at", { ascending: false }).limit(60),
    sb.from("pb_daily_revenue").select("*").eq("booth_id", booth.id)
      .gte("day", daysBack(14)).order("day"),
  ]);

  const st = boothStatus(booth);
  const hb = booth.last_heartbeat || {};
  const photo = BOOTH_PHOTOS[booth.kabin_id];

  return (
    <main>
      <AutoRefresh />
      <header className="site">
        <h1><Link href={`/org/${slug}`}>PHOTOAUTOMAT</Link></h1>
        <nav><span className="label">{org.name}</span></nav>
      </header>

      <div className="photo" style={{ height: 150, marginBottom: 24, border: "1px solid #000" }}>
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
            {hb.printer ? (hb.printer.ok ? "OK" : (hb.printer.issues || []).join(", ").toUpperCase()) : "—"}</div></div>
        <div><div className="label">App version</div><div className="v">{hb.version || "—"}</div></div>
      </div>

      <div className="section"><h2>Revenue · last 14 days</h2>
        <span className="label">{fmtFt((revenue || []).reduce((a, r) => a + r.revenue_huf, 0))} total</span></div>
      {(revenue || []).length > 0
        ? <BarChart labels={revenue.map((r) => r.day)} data={revenue.map((r) => r.revenue_huf)} h={120} />
        : <div className="empty">No revenue yet</div>}

      <div className="section"><h2>Recent events</h2></div>
      <table>
        <thead><tr><th>Time</th><th>Type</th><th>Sev</th><th>Detail</th></tr></thead>
        <tbody>
          {(events || []).map((e) => (
            <tr key={e.id}>
              <td style={{ whiteSpace: "nowrap" }}>{fmtTime(e.occurred_at)}</td>
              <td>{e.type}</td>
              <td><span className={`sev ${e.severity}`}>{e.severity}</span></td>
              <td>{e.amount != null && <>{fmtFt(e.amount)} </>}{e.data?.reason || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
