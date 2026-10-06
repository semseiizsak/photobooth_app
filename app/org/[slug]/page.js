import Link from "next/link";
import {
  db, boothStatus, STATUS_COLOR, STATUS_LABEL, BOOTH_PHOTOS,
  fmtFt, timeAgo, todayBudapest, daysBack, seriesFor,
} from "@/lib/pb";
import { Spark } from "@/lib/spark";
import AutoRefresh from "../../dashboard/refresh";

export const dynamic = "force-dynamic";

// Partner fleet view — same cards as the admin FLEET page, scoped to the
// partner's booths and read-only. Access is enforced in middleware.ts
// against the org's access_code.
export default async function OrgFleet({ params }) {
  const { slug } = await params;
  const sb = db();
  const { data: org } = await sb.from("pb_organizations").select("*").eq("slug", slug).single();
  if (!org) return <div className="empty">Unknown partner</div>;

  const [{ data: booths }, { data: rev7 }] = await Promise.all([
    sb.from("pb_booths").select("*").eq("org_id", org.id).order("name"),
    sb.from("pb_daily_revenue").select("*").gte("day", daysBack(7)),
  ]);
  const list = booths || [];
  const ids = new Set(list.map((b) => b.id));
  const rows = (rev7 || []).filter((r) => ids.has(r.booth_id));
  const today = todayBudapest();
  const todayRows = rows.filter((r) => r.day === today);
  const totalToday = todayRows.reduce((s, r) => s + r.revenue_huf, 0);
  const online = list.filter((b) => boothStatus(b) !== "offline").length;

  return (
    <main>
      <AutoRefresh />
      <header className="site">
        <h1>PHOTOAUTOMAT</h1>
        <nav><span className="label">{org.name}</span></nav>
      </header>

      <div className="stats">
        <div className="stat"><div className="label">Booths online</div>
          <div className="big">{online} / {list.length}</div></div>
        <div className="stat"><div className="label">Revenue today</div>
          <div className="big">{fmtFt(totalToday)}</div></div>
        <div className="stat"><div className="label">Sessions today</div>
          <div className="big">{todayRows.reduce((s, r) => s + r.sessions, 0)}</div></div>
      </div>

      {list.length === 0 ? (
        <div className="empty">No booths assigned yet</div>
      ) : (
        <div className="grid">
          {list.map((b) => {
            const st = boothStatus(b);
            const hb = b.last_heartbeat || {};
            const rev = todayRows.find((r) => r.booth_id === b.id);
            const photo = BOOTH_PHOTOS[b.kabin_id];
            return (
              <Link key={b.id} href={`/org/${slug}/booth/${b.id}`} className="card">
                <div className="photo">
                  {photo ? <img src={photo} alt="" />
                    : <div className="mono-letter">{(b.name || "?")[0]}</div>}
                  <div className="overlay">
                    <span className="dot" style={{ background: STATUS_COLOR[st] }} />
                    {b.name || b.kabin_id}
                    <span className="loc">{b.location}</span>
                  </div>
                </div>
                <div className="body">
                  <div className="row">
                    <span className="badge" style={{ color: STATUS_COLOR[st] }}>{STATUS_LABEL[st]}</span>
                    <span className="label">{st === "offline" ? `last seen ${timeAgo(b.last_seen_at)}` : hb.state || ""}</span>
                  </div>
                  <div className="row">
                    <span className="label">Today</span>
                    <span className="mono">{fmtFt(rev?.revenue_huf)} · {rev?.sessions || 0}×</span>
                  </div>
                  <div className="row">
                    <span className="label">7 days</span>
                    <Spark data={seriesFor(rows, b.id, 7)} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
