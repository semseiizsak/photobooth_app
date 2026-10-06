import Link from "next/link";
import { db } from "@/lib/pb";

export const dynamic = "force-dynamic";

export default async function Revenue() {
  const sb = db();
  const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const [{ data: rows }, { data: booths }] = await Promise.all([
    sb.from("pb_daily_revenue").select("*").gte("day", since),
    sb.from("pb_booths").select("id,name,kabin_id"),
  ]);
  const names = Object.fromEntries(
    (booths || []).map((b) => [b.id, b.name || b.kabin_id])
  );

  // Leaderboard: 30-day totals per booth
  const totals = {};
  for (const r of rows || []) {
    totals[r.booth_id] = totals[r.booth_id] || { revenue: 0, sessions: 0 };
    totals[r.booth_id].revenue += r.revenue_huf;
    totals[r.booth_id].sessions += r.sessions;
  }
  const board = Object.entries(totals).sort((a, b) => b[1].revenue - a[1].revenue);
  const max = board.length ? board[0][1].revenue : 1;

  // Daily fleet totals
  const byDay = {};
  for (const r of rows || []) byDay[r.day] = (byDay[r.day] || 0) + r.revenue_huf;
  const days = Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <main>
      <div className="section" style={{ marginTop: 0 }}><h2>Leaderboard — last 30 days</h2></div>
      <table>
        <thead><tr><th>#</th><th>Booth</th><th>Sessions</th><th>Revenue</th><th style={{ width: "40%" }}></th></tr></thead>
        <tbody>
          {board.map(([id, t], i) => (
            <tr key={id}>
              <td>{i + 1}</td>
              <td><Link href={`/dashboard/booth/${id}`}>{names[id] || "?"}</Link></td>
              <td>{t.sessions}</td>
              <td>Ft {t.revenue.toLocaleString("hu-HU")}</td>
              <td><div className="bar" style={{ width: `${(t.revenue / max) * 100}%` }} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="section"><h2>Fleet revenue by day</h2></div>
      <table>
        <thead><tr><th>Day</th><th>Revenue</th></tr></thead>
        <tbody>
          {days.map(([day, rev]) => (
            <tr key={day}><td>{day}</td><td>Ft {rev.toLocaleString("hu-HU")}</td></tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
