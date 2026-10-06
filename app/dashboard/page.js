import Link from "next/link";
import {
  db, boothStatus, STATUS_COLOR, STATUS_LABEL, BOOTH_PHOTOS,
  fmtFt, timeAgo, todayBudapest, daysBack, seriesFor,
} from "@/lib/pb";
import { Spark } from "@/lib/spark";
import AutoRefresh from "./refresh";
import { createBooth } from "./actions";

export const dynamic = "force-dynamic";

export default async function Fleet() {
  const sb = db();
  const since24h = new Date(Date.now() - 86400_000).toISOString();
  const [{ data: booths }, { data: rev7 }, { data: errs }] = await Promise.all([
    sb.from("pb_booths").select("*").order("name"),
    sb.from("pb_daily_revenue").select("*").gte("day", daysBack(7)),
    sb.from("pb_events").select("booth_id,type,severity,data,occurred_at")
      .in("severity", ["error", "warning"]).gte("occurred_at", since24h)
      .order("occurred_at", { ascending: false }),
  ]);

  const list = booths || [];
  const today = todayBudapest();
  const todayRows = (rev7 || []).filter((r) => r.day === today);
  const totalToday = todayRows.reduce((s, r) => s + r.revenue_huf, 0);
  const sessionsToday = todayRows.reduce((s, r) => s + r.sessions, 0);
  const online = list.filter((b) => boothStatus(b) !== "offline").length;
  const lastErr = {};
  for (const e of errs || []) if (!lastErr[e.booth_id]) lastErr[e.booth_id] = e;

  return (
    <main>
      <AutoRefresh />
      <div className="stats">
        <div className="stat">
          <div className="label">Booths online</div>
          <div className="big">{online} / {list.length}</div>
        </div>
        <div className="stat">
          <div className="label">Revenue today</div>
          <div className="big">{fmtFt(totalToday)}</div>
        </div>
        <div className="stat">
          <div className="label">Sessions today</div>
          <div className="big">{sessionsToday}</div>
        </div>
        <div className="stat">
          <div className="label">Errors · 24h</div>
          <div className="big" style={{ color: (errs || []).some(e => e.severity === "error") ? "#d62828" : undefined }}>
            {(errs || []).length}
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="empty">No booths enrolled yet — see cloud/README.md</div>
      ) : (
        <div className="grid">
          {list.map((b) => {
            const st = boothStatus(b);
            const hb = b.last_heartbeat || {};
            const rev = todayRows.find((r) => r.booth_id === b.id);
            const photo = BOOTH_PHOTOS[b.kabin_id];
            const err = lastErr[b.id];
            const spark = seriesFor(rev7, b.id, 7);
            return (
              <Link key={b.id} href={`/dashboard/booth/${b.id}`} className="card">
                <div className="photo">
                  {photo
                    ? <img src={photo} alt="" />
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
                    <span className="label">Printer</span>
                    <span className="mono" style={{ color: hb.printer && hb.printer.ok === false ? "#d62828" : undefined }}>
                      {hb.printer ? (hb.printer.ok ? "OK" : (hb.printer.issues || []).join(", ").toUpperCase()) : "—"}
                    </span>
                  </div>
                  <div className="row">
                    <span className="label">7 days</span>
                    <Spark data={spark} />
                  </div>
                  {err && (
                    <div className="err" title={err.data?.reason || err.type}>
                      ⚠ {timeAgo(err.occurred_at)} — {err.type}{err.data?.reason ? `: ${err.data.reason}` : ""}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="section"><h2>Add a booth</h2>
        <span className="label">then open it and generate a pairing code</span></div>
      <div className="panel">
        <form className="inline" action={createBooth}>
          <div className="field"><span className="label">Name</span>
            <input name="name" placeholder="CORVIN" style={{ width: 180 }} required /></div>
          <div className="field"><span className="label">Location</span>
            <input name="location" placeholder="Budapest 1082" style={{ width: 200 }} /></div>
          <button>Create booth</button>
        </form>
      </div>
    </main>
  );
}
