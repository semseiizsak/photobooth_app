import { db, fmtTime } from "@/lib/pb";
import { setLeadStatus } from "./actions";

export const dynamic = "force-dynamic";

const C = { new: "#d62828", contacted: "#e6a700", closed: "#666" };

export default async function Leads() {
  const { data: leads } = await db().from("pb_leads")
    .select("*").order("created_at", { ascending: false }).limit(200);

  return (
    <main>
      <div className="section" style={{ marginTop: 0 }}>
        <h2>Pilot requests · {(leads || []).filter((l) => l.status === "new").length} new</h2>
        <span className="label">from /software — reply within 2 business days</span>
      </div>
      {(leads || []).length === 0 ? (
        <div className="empty">No requests yet</div>
      ) : (
        <table>
          <thead><tr><th>When</th><th>Who</th><th>Where</th><th>Booths</th><th>Hardware / message</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id}>
                <td style={{ whiteSpace: "nowrap" }}>{fmtTime(l.created_at)}</td>
                <td className="sans">{l.name}<br />
                  <a href={`mailto:${l.email}`} className="mono" style={{ fontSize: 11 }}>{l.email}</a></td>
                <td className="sans">{l.country || "—"}</td>
                <td className="sans">{l.booths || "—"}</td>
                <td className="sans" style={{ maxWidth: 320 }}>
                  {l.hardware && <div>{l.hardware}</div>}
                  {l.message && <div style={{ color: "#666" }}>{l.message}</div>}
                </td>
                <td><span className="badge" style={{ color: C[l.status] }}>{l.status}</span></td>
                <td>
                  <div className="actions">
                    {l.status !== "contacted" &&
                      <form action={setLeadStatus.bind(null, l.id, "contacted")}><button className="ghost">Contacted</button></form>}
                    {l.status !== "closed" &&
                      <form action={setLeadStatus.bind(null, l.id, "closed")}><button className="ghost">Close</button></form>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
