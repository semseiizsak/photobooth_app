import Link from "next/link";

export default function DocsIndex() {
  const items = [
    ["/docs/quickstart", "QUICKSTART", "From boxes on a table to a booth that takes card payments and prints — in order, including the Nayax merchant provisioning you must start first."],
    ["/docs/hardware", "HARDWARE GUIDE", "Exactly what to buy, why, and the total bill of materials (~€2,200 per booth before the shell)."],
  ];
  return (
    <main>
      <div className="section" style={{ marginTop: 0 }}><h2>Operator documentation</h2></div>
      <div className="stats" style={{ gridTemplateColumns: "1fr" }}>
        {items.map(([href, t, d]) => (
          <Link href={href} key={href} className="stat" style={{ padding: "24px 22px" }}>
            <div className="label" style={{ color: "#000", fontWeight: 600 }}>{t} →</div>
            <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, margin: "10px 0 0" }}>{d}</p>
          </Link>
        ))}
      </div>
      <p className="label" style={{ marginTop: 24 }}>
        Pilot operators also get hands-on onboarding — these pages are the reference, not the whole journey.
      </p>
    </main>
  );
}
