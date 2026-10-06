import Link from "next/link";
import { db, boothStatus, STATUS_COLOR } from "@/lib/pb";

export const dynamic = "force-dynamic";

function todayBudapest() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Budapest" });
}

export default async function Fleet() {
  const sb = db();
  const [{ data: booths }, { data: revenue }] = await Promise.all([
    sb.from("pb_booths").select("*").order("name"),
    sb.from("pb_daily_revenue").select("*").eq("day", todayBudapest()),
  ]);

  const revByBooth = Object.fromEntries(
    (revenue || []).map((r) => [r.booth_id, r])
  );
  const list = booths || [];
  const totalToday = (revenue || []).reduce((s, r) => s + r.revenue_huf, 0);
  const online = list.filter((b) => boothStatus(b) !== "offline").length;

  return (
    <main>
      <div className="section" style={{ marginTop: 0, display: "flex", gap: 48 }}>
        <div>
          <div className="label">Booths online</div>
          <div className="big">{online} / {list.length}</div>
        </div>
        <div>
          <div className="label">Revenue today</div>
          <div className="big">Ft {totalToday.toLocaleString("hu-HU")}</div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="empty">No booths enrolled yet — see cloud/README.md</div>
      ) : (
        <div className="grid">
          {list.map((b) => {
            const st = boothStatus(b);
            const hb = b.last_heartbeat || {};
            const rev = revByBooth[b.id];
            return (
              <Link key={b.id} href={`/dashboard/booth/${b.id}`} className="card">
                <div className="name">
                  <span className="dot" style={{ background: STATUS_COLOR[st] }} />
                  {b.name || b.kabin_id}
                </div>
                <div className="label">{b.location}</div>
                <div className="row">
                  <span className="label">Today</span>
                  <span className="mono">
                    Ft {(rev?.revenue_huf || 0).toLocaleString("hu-HU")} · {rev?.sessions || 0}×
                  </span>
                </div>
                <div className="row">
                  <span className="label">State</span>
                  <span className="mono">{st === "offline" ? "OFFLINE" : hb.state || "—"}</span>
                </div>
                <div className="row">
                  <span className="label">Printer</span>
                  <span className="mono">
                    {hb.printer ? (hb.printer.ok ? "OK" : (hb.printer.issues || []).join(", ")) : "—"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
