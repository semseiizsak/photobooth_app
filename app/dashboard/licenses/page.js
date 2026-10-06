import { db, fmtTime } from "@/lib/pb";
import { createLicense, setLicenseStatus, unbindMachine, saveLatestVersion } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_C = { active: "#1db954", revoked: "#d62828", lapsed: "#e6a700" };

export default async function Licenses() {
  const sb = db();
  const [{ data: lics }, { data: ver }] = await Promise.all([
    sb.from("pb_licenses").select("*").order("created_at", { ascending: false }),
    sb.from("pb_settings").select("value").eq("key", "latest_version").single(),
  ]);
  const v = ver?.value || {};

  return (
    <main>
      <div className="section" style={{ marginTop: 0 }}><h2>Issue a license</h2></div>
      <div className="panel">
        <form className="inline" action={createLicense}>
          <div className="field"><span className="label">Plan</span>
            <select name="plan" defaultValue="pro">
              <option value="pro">PRO — monthly</option>
              <option value="event_pass">EVENT PASS — 24h</option>
              <option value="trial">TRIAL</option>
            </select></div>
          <div className="field"><span className="label">Customer email (optional)</span>
            <input name="email" type="email" placeholder="partner@example.com" style={{ width: 240 }} /></div>
          <button>Generate key</button>
        </form>
        <p className="label" style={{ marginTop: 12 }}>
          Stripe checkout issues keys automatically once STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET
          are set in Vercel (webhook endpoint: /api/stripe/webhook). Until then, issue keys here
          and charge manually.
        </p>
      </div>

      <div className="section"><h2>Licenses · {(lics || []).length}</h2></div>
      {(lics || []).length === 0 ? (
        <div className="empty">No licenses issued yet</div>
      ) : (
        <table>
          <thead><tr><th>Key</th><th>Plan</th><th>Status</th><th>Machine</th><th>Email</th><th>Expires</th><th>Last validated</th><th></th></tr></thead>
          <tbody>
            {lics.map((l) => (
              <tr key={l.id}>
                <td>{l.license_key}</td>
                <td>{l.plan}</td>
                <td><span className="badge" style={{ color: STATUS_C[l.status] || "#666" }}>{l.status}</span></td>
                <td title={l.machine_id || ""}>{l.machine_id ? `${l.machine_id.slice(0, 10)}…` : "—"}</td>
                <td className="sans">{l.email || "—"}</td>
                <td>{l.expires_at ? fmtTime(l.expires_at) : "—"}</td>
                <td>{l.last_validated ? fmtTime(l.last_validated) : "never"}</td>
                <td>
                  <div className="actions">
                    {l.status === "active"
                      ? <form action={setLicenseStatus.bind(null, l.id, "revoked")}><button className="danger">Revoke</button></form>
                      : <form action={setLicenseStatus.bind(null, l.id, "active")}><button className="ghost">Activate</button></form>}
                    {l.machine_id &&
                      <form action={unbindMachine.bind(null, l.id)}><button className="ghost">Unbind PC</button></form>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="section"><h2>Software update channel</h2>
        <span className="label">served to every booth via /v1/latest-version</span></div>
      <div className="panel">
        <form className="inline" action={saveLatestVersion}>
          <div className="field"><span className="label">Latest version</span>
            <input name="version" defaultValue={v.version || ""} placeholder="1.1.0" style={{ width: 110 }} /></div>
          <div className="field"><span className="label">Download URL</span>
            <input name="download_url" defaultValue={v.download_url || ""} placeholder="https://…/PhotoBoothSetup.exe" style={{ width: 340 }} /></div>
          <button>Publish</button>
        </form>
      </div>
    </main>
  );
}
