import { db } from "@/lib/pb";

export const dynamic = "force-dynamic";
export const metadata = { title: "PHOTOAUTOMAT — YOUR PHOTO" };

// Guest microsite: the page behind the QR code on the booth's printing
// screen. Deliberately self-contained styling (no site CSS dependencies).
export default async function StripPage({ params }) {
  const { id } = await params;
  const sb = db();
  const { data: strip } = await sb.from("pb_strips")
    .select("*, pb_booths(name,location)").eq("id", id).single();

  const gone = !strip || new Date(strip.expires_at) < new Date();
  const booth = strip?.pb_booths;
  const taken = strip ? new Date(strip.created_at).toLocaleDateString("hu-HU",
    { timeZone: "Europe/Budapest", year: "numeric", month: "long", day: "numeric" }) : null;

  const S = {
    // height+overflow: the site's global CSS locks body scrolling, so this
    // page scrolls itself; fontWeight resets the global *{font-weight:700}.
    page: { height: "100vh", overflowY: "auto", background: "#fff", color: "#000",
      fontFamily: "var(--font-geist-sans, system-ui, sans-serif)", fontWeight: 400,
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "40px 20px 60px" },
    h1: { fontSize: 15, fontWeight: 600, letterSpacing: "0.2em", margin: "0 0 6px" },
    sub: { fontSize: 10, letterSpacing: "0.14em", color: "#666", fontWeight: 400,
      textTransform: "uppercase", marginBottom: 36 },
    img: { maxWidth: "min(420px, 92vw)", border: "1px solid #000",
      boxShadow: "8px 8px 0 #000" },
    btn: { display: "inline-block", marginTop: 36, background: "#000", color: "#fff",
      padding: "14px 32px", fontSize: 11, fontWeight: 600, letterSpacing: "0.15em",
      textTransform: "uppercase", textDecoration: "none" },
    foot: { marginTop: 48, fontSize: 10, letterSpacing: "0.12em", color: "#bcbcbc",
      fontWeight: 400, textTransform: "uppercase", textAlign: "center", lineHeight: 2 },
    a: { color: "#666", textDecoration: "none", fontWeight: 400 },
  };

  return (
    <div style={S.page}>
      <h1 style={S.h1}>PHOTOAUTOMAT</h1>
      <div style={S.sub}>
        {gone ? "photo expired" : `${booth?.name || ""} · ${taken}`}
      </div>

      {gone ? (
        <p style={{ letterSpacing: "0.1em", fontSize: 13, textTransform: "uppercase" }}>
          This photo is no longer available — strips are kept for 30 days.
        </p>
      ) : (
        <>
          <img src={`/s/${id}/image`} alt="Your photo strip" style={S.img} />
          <a href={`/s/${id}/image?download`} style={S.btn}>Download</a>
        </>
      )}

      <div style={S.foot}>
        <a href="https://www.photoautomat.hu" style={S.a}>WWW.PHOTOAUTOMAT.HU</a><br />
        <a href="https://www.photoautomat.hu/locations" style={S.a}>VISIT A BOOTH</a>
      </div>
    </div>
  );
}
