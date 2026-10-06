import Link from "next/link";
import { db, fmtTime, timeAgo } from "@/lib/pb";
import AutoRefresh from "../refresh";

export const dynamic = "force-dynamic";

export default async function Errors() {
  const sb = db();
  const [{ data: events }, { data: booths }] = await Promise.all([
    sb.from("pb_events").select("*").in("severity", ["error", "warning"])
      .order("occurred_at", { ascending: false }).limit(200),
    sb.from("pb_booths").select("id,name,kabin_id"),
  ]);
  const names = Object.fromEntries(
    (booths || []).map((b) => [b.id, b.name || b.kabin_id])
  );
  const counts = {};
  for (const e of events || []) counts[e.booth_id] = (counts[e.booth_id] || 0) + 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <main>
      <AutoRefresh />
      <div className="stats">
        <div className="stat"><div className="label">Open feed (last 200)</div>
          <div className="big">{(events || []).length}</div></div>
        {top.map(([id, n]) => (
          <div className="stat" key={id}>
            <div className="label"><Link href={`/dashboard/booth/${id}`}>{names[id] || "?"}</Link></div>
            <div className="big">{n}</div>
          </div>
        ))}
      </div>

      {(events || []).length === 0 ? (
        <div className="empty">No errors — all quiet</div>
      ) : (
        <table>
          <thead><tr><th>When</th><th>Booth</th><th>Type</th><th>Sev</th><th>Detail</th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td style={{ whiteSpace: "nowrap" }} title={fmtTime(e.occurred_at)}>{timeAgo(e.occurred_at)}</td>
                <td><Link href={`/dashboard/booth/${e.booth_id}`}>{names[e.booth_id] || "?"}</Link></td>
                <td>{e.type}</td>
                <td><span className={`sev ${e.severity}`}>{e.severity}</span></td>
                <td>
                  {e.data?.reason || e.data?.exception || ""}
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
      )}
    </main>
  );
}
