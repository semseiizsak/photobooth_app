import Link from "next/link";
import { db } from "@/lib/pb";

export const dynamic = "force-dynamic";

const fmt = (ts) =>
  new Date(ts).toLocaleString("hu-HU", { timeZone: "Europe/Budapest" });

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

  return (
    <main>
      <div className="section" style={{ marginTop: 0 }}><h2>Live error feed — all booths</h2></div>
      {(events || []).length === 0 ? (
        <div className="empty">No errors — all quiet</div>
      ) : (
        <table>
          <thead><tr><th>Time</th><th>Booth</th><th>Type</th><th>Sev</th><th>Detail</th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td style={{ whiteSpace: "nowrap" }}>{fmt(e.occurred_at)}</td>
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
