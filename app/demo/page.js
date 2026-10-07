import "../dashboard/pb.css";
import { Spark, BarChart } from "@/lib/spark";

export const metadata = {
  title: "PHOTOAUTOMAT — LIVE DEMO",
  description: "Explore the PHOTOAUTOMAT fleet dashboard with sample data.",
};

// Public, read-only demo of the fleet dashboard with SYNTHETIC data.
// Deterministic per day (seeded PRNG) so it looks alive but costs nothing
// and touches no real booth. Linked from /software so a prospect can feel
// the product before talking to anyone.

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

const BOOTHS = [
  { name: "OKTOGON",  loc: "Budapest 1067", img: "/nyugati.jpg", mult: 1.35 },
  { name: "CORVIN",   loc: "Budapest 1082", img: "/dob.jpg",     mult: 1.1 },
  { name: "DEÁK",     loc: "Budapest 1052", img: "/gozsdu.jpg",  mult: 1.0 },
  { name: "MOM PARK", loc: "Budapest 1123", img: "/westend.jpg", mult: 0.85 },
  { name: "ALLEE",    loc: "Budapest 1117", img: "/kiraly.jpg",  mult: 0.75 },
  { name: "ARÉNA",    loc: "Budapest 1087", img: "/madach.jpg",  mult: 0.9 },
];
const PRICE = 1990;

function build() {
  const today = new Date();
  const daySeed = Math.floor(today.getTime() / 86400_000);
  const hour = Number(today.toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Europe/Budapest" }));
  const dayFrac = Math.min(1, Math.max(0.05, (hour - 9) / 13)); // booths earn 9:00–22:00

  const booths = BOOTHS.map((b, i) => {
    const r = rng(daySeed * 7919 + i * 104729);
    const days = Array.from({ length: 30 }, (_, d) => {
      const date = new Date(today.getTime() - (29 - d) * 86400_000);
      const wknd = [0, 5, 6].includes(date.getDay()) ? 1.6 : 1.0;
      return Math.round((10 + r() * 14) * wknd * b.mult);
    });
    const todaySessions = Math.round(days[29] * dayFrac);
    const used = Math.round(120 + r() * 520);
    return {
      ...b,
      days,
      spark: days.slice(-7).map((s) => s * PRICE),
      today: todaySessions,
      paperLeft: Math.max(0, 700 - used),
      status: i === 4 ? "warning" : i === 5 ? "offline" : "online",
      state: i === 5 ? "OFFLINE" : i === 4 ? "IDLE" : ["IDLE", "IDLE", "SHOOTING", "PRINTING"][Math.floor(r() * 4)],
    };
  });
  return { booths, hour };
}

const C = { online: "#1db954", warning: "#e6a700", error: "#d62828", offline: "#bcbcbc" };
const fmtFt = (n) => `Ft ${n.toLocaleString("hu-HU")}`;

export default function Demo() {
  const { booths } = build();
  const live = booths.filter((b) => b.status !== "offline");
  const todayRev = booths.reduce((s, b) => s + (b.status === "offline" ? 0 : b.today * PRICE), 0);
  const todaySess = booths.reduce((s, b) => s + (b.status === "offline" ? 0 : b.today), 0);

  const days = Array.from({ length: 30 }, (_, d) =>
    new Date(Date.now() - (29 - d) * 86400_000).toISOString().slice(0, 10));
  const fleetByDay = days.map((_, d) =>
    booths.reduce((s, b) => s + b.days[d] * PRICE, 0));
  const board = [...booths].sort((a, b) =>
    b.days.reduce((x, y) => x + y) - a.days.reduce((x, y) => x + y));
  const max30 = board[0].days.reduce((x, y) => x + y) * PRICE;

  const errors = [
    ["12 min ago", "ALLEE", "tap_rejected_busy", "warning", "guest tapped during an active session — auto-refunded"],
    ["1h ago", "ARÉNA", "offline", "error", "no heartbeat — power or internet down · alert email sent"],
    ["3h ago", "MOM PARK", "paper_low", "warning", "~41 prints left (6%) · alert email sent"],
    ["yesterday", "CORVIN", "print_failed", "error", "print_timeout → auto-recovered, booth back in service"],
  ];

  return (
    <div className="pbd">
      <div className="wrap">
        <header className="site">
          <h1><a href="/software">PHOTOAUTOMAT</a></h1>
          <nav>
            <span className="label" style={{ color: "#d62828" }}>LIVE DEMO · SAMPLE DATA</span>
            <a href="/software#pilot">Get this for your booths</a>
          </nav>
        </header>

        <div className="stats">
          <div className="stat"><div className="label">Booths online</div>
            <div className="big">{live.length} / {booths.length}</div></div>
          <div className="stat"><div className="label">Revenue today</div>
            <div className="big">{fmtFt(todayRev)}</div></div>
          <div className="stat"><div className="label">Sessions today</div>
            <div className="big">{todaySess}</div></div>
          <div className="stat"><div className="label">Alerts · 24h</div>
            <div className="big" style={{ color: "#d62828" }}>2</div></div>
        </div>

        <div className="grid">
          {booths.map((b) => (
            <div key={b.name} className="card">
              <div className="photo">
                <img src={b.img} alt="" />
                <div className="overlay">
                  <span className="dot" style={{ background: C[b.status] }} />
                  {b.name}
                  <span className="loc">{b.loc}</span>
                </div>
              </div>
              <div className="body">
                <div className="row">
                  <span className="badge" style={{ color: C[b.status] }}>
                    {b.status === "offline" ? "OFFLINE" : b.status === "warning" ? "ATTENTION" : "ONLINE"}
                  </span>
                  <span className="label">{b.state}</span>
                </div>
                <div className="row"><span className="label">Today</span>
                  <span className="mono">{b.status === "offline" ? "—" : `${fmtFt(b.today * PRICE)} · ${b.today}×`}</span></div>
                <div className="row"><span className="label">Paper</span>
                  <span className="mono" style={{ color: b.paperLeft < 70 ? "#d62828" : undefined }}>
                    ~{b.paperLeft} · {Math.round((b.paperLeft / 700) * 100)}%</span></div>
                <div className="row"><span className="label">7 days</span><Spark data={b.spark} /></div>
                {b.status === "offline" && (
                  <div className="err">⚠ 1h ago — offline · alert email sent to the operator</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="section"><h2>Fleet revenue · last 30 days</h2>
          <span className="label">{fmtFt(fleetByDay.reduce((a, b) => a + b, 0))} total</span></div>
        <BarChart labels={days} data={fleetByDay} h={140} />

        <div className="section"><h2>Leaderboard · 30 days</h2></div>
        <table>
          <thead><tr><th>#</th><th>Booth</th><th>Sessions</th><th>Revenue</th><th style={{ width: "40%" }}></th></tr></thead>
          <tbody>
            {board.map((b, i) => {
              const sess = b.days.reduce((x, y) => x + y);
              return (
                <tr key={b.name}>
                  <td>{i + 1}</td><td>{b.name}</td><td>{sess}</td>
                  <td>{fmtFt(sess * PRICE)}</td>
                  <td><div className="bar" style={{ width: `${(sess * PRICE / max30) * 100}%` }} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="section"><h2>Live error feed</h2>
          <span className="label">every failure, with the exact reason — and an email before guests notice</span></div>
        <table>
          <thead><tr><th>When</th><th>Booth</th><th>Type</th><th>Sev</th><th>Detail</th></tr></thead>
          <tbody>
            {errors.map(([when, booth, type, sev, det], i) => (
              <tr key={i}>
                <td style={{ whiteSpace: "nowrap" }}>{when}</td><td>{booth}</td><td>{type}</td>
                <td><span className={`sev ${sev}`}>{sev}</span></td>
                <td className="sans">{det}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="panel" style={{ marginTop: 40, textAlign: "center" }}>
          <p className="sans" style={{ fontSize: 14, color: "#333", margin: "0 0 18px" }}>
            This is sample data — your real booths look exactly like this, live, from your phone.
          </p>
          <a className="btn" href="/software#pilot">Request pilot access</a>
        </div>
      </div>
    </div>
  );
}
