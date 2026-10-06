// Tiny server-rendered SVG charts for the dashboard — no client JS, no deps.

export function Spark({ data, w = 120, h = 28, color = "#000" }) {
  const max = Math.max(...data, 1);
  const bw = w / data.length;
  return (
    <svg width={w} height={h} style={{ display: "block" }} aria-hidden>
      {data.map((v, i) => {
        const bh = Math.max(v > 0 ? 2 : 1, Math.round((v / max) * h));
        return (
          <rect key={i} x={i * bw + 1} y={h - bh} width={Math.max(1, bw - 2)}
                height={bh} fill={v > 0 ? color : "#e5e5e5"} />
        );
      })}
    </svg>
  );
}

export function BarChart({ labels, data, w = 900, h = 160, color = "#000" }) {
  const max = Math.max(...data, 1);
  const bw = w / data.length;
  return (
    <svg viewBox={`0 0 ${w} ${h + 18}`} style={{ width: "100%", display: "block" }}>
      {data.map((v, i) => {
        const bh = Math.max(v > 0 ? 2 : 1, Math.round((v / max) * h));
        return (
          <g key={i}>
            <rect x={i * bw + 2} y={h - bh} width={Math.max(1, bw - 4)}
                  height={bh} fill={v > 0 ? color : "#eee"}>
              <title>{labels[i]}: {v.toLocaleString("hu-HU")} Ft</title>
            </rect>
            {i % Math.ceil(data.length / 10) === 0 && (
              <text x={i * bw + 2} y={h + 13} fontSize="9" fill="#666"
                    fontFamily="var(--pbd-mono)">{labels[i].slice(5)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
