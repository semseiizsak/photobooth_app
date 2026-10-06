import Link from "next/link";
import { db, fmtFt, daysBack } from "@/lib/pb";
import { BarChart } from "@/lib/spark";
import AutoRefresh from "../refresh";

export const dynamic = "force-dynamic";

export default async function Revenue() {
  const sb = db();
  const [{ data: rows }, { data: booths }] = await Promise.all([
    sb.from("pb_daily_revenue").select("*").gte("day", daysBack(30)),
    sb.from("pb_booths").select("id,name,kabin_id"),
  ]);
  const names = Object.fromEntries(
    (booths || []).map((b) => [b.id, b.name || b.kabin_id])
  );

  const totals = {};
  for (const r of rows || []) {
    totals[r.booth_id] = totals[r.booth_id] || { revenue: 0, sessions: 0 };
    totals[r.booth_id].revenue += r.revenue_huf;
    totals[r.booth_id].sessions += r.sessions;
  }
  const board = Object.entries(totals).sort((a, b) => b[1].revenue - a[1].revenue);
  const max = board.length ? board[0][1].revenue : 1;
  const fleetTotal = board.reduce((s, [, t]) => s + t.revenue, 0);
  const fleetSessions = board.reduce((s, [, t]) => s + t.sessions, 0);

  const byDay = {};
  for (const r of rows || []) byDay[r.day] = (byDay[r.day] || 0) + r.revenue_huf;
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000)
      .toLocaleDateString("sv-SE", { timeZone: "Europe/Budapest" });
    days.push(d);
  }
  const vals = days.map((d) => byDay[d] || 0);

  return (
    <main>
      <AutoRefresh seconds={120} />
      <div className="stats">
        <div className="stat"><div className="label">Fleet · 30 days</div><div className="big">{fmtFt(fleetTotal)}</div></div>
        <div className="stat"><div className="label">Sessions · 30 days</div><div className="big">{fleetSessions}</div></div>
        <div className="stat"><div className="label">Avg / session</div>
          <div className="big">{fmtFt(fleetSessions ? Math.round(fleetTotal / fleetSessions) : 0)}</div></div>
        <div className="stat"><div className="label">Active booths</div><div className="big">{board.length}</div></div>
      </div>

      <div className="section" style={{ marginTop: 0 }}><h2>Fleet revenue · daily</h2></div>
      <BarChart labels={days} data={vals} h={140} />

      <div className="section"><h2>Leaderboard · 30 days</h2></div>
      <table>
        <thead><tr><th>#</th><th>Booth</th><th>Sessions</th><th>Revenue</th><th style={{ width: "40%" }}></th></tr></thead>
        <tbody>
          {board.map(([id, t], i) => (
            <tr key={id}>
              <td>{i + 1}</td>
              <td><Link href={`/dashboard/booth/${id}`}>{names[id] || "?"}</Link></td>
              <td>{t.sessions}</td>
              <td>{fmtFt(t.revenue)}</td>
              <td><div className="bar" style={{ width: `${(t.revenue / max) * 100}%` }} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
