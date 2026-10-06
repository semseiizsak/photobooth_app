import Link from "next/link";
import { db } from "@/lib/pb";
import { createOrg, rotateAccessCode, assignBooth } from "./actions";

export const dynamic = "force-dynamic";

export default async function Orgs() {
  const sb = db();
  const [{ data: orgs }, { data: booths }] = await Promise.all([
    sb.from("pb_organizations").select("*").order("name"),
    sb.from("pb_booths").select("id,name,kabin_id,org_id").order("name"),
  ]);

  return (
    <main>
      <div className="section" style={{ marginTop: 0 }}><h2>New partner</h2>
        <span className="label">partners get their own fleet view at /org/&lt;slug&gt;</span></div>
      <div className="panel">
        <form className="inline" action={createOrg}>
          <div className="field"><span className="label">Name</span>
            <input name="name" placeholder="Franchise Kft." style={{ width: 220 }} /></div>
          <div className="field"><span className="label">Slug (url)</span>
            <input name="slug" placeholder="franchise-kft" style={{ width: 180 }} /></div>
          <button>Create</button>
        </form>
      </div>

      <div className="section"><h2>Partners · {(orgs || []).length}</h2></div>
      {(orgs || []).length === 0 ? (
        <div className="empty">No partners yet — your own booths need none</div>
      ) : (
        <table>
          <thead><tr><th>Name</th><th>Dashboard</th><th>Access code</th><th>Booths</th><th></th></tr></thead>
          <tbody>
            {orgs.map((o) => (
              <tr key={o.id}>
                <td className="sans">{o.name}</td>
                <td><Link href={`/org/${o.slug}`}>/org/{o.slug}</Link></td>
                <td>{o.access_code}</td>
                <td>{(booths || []).filter((b) => b.org_id === o.id).map((b) => b.name).join(", ") || "—"}</td>
                <td><form action={rotateAccessCode.bind(null, o.id)}>
                  <button className="ghost">New code</button></form></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="section"><h2>Booth assignment</h2></div>
      <table>
        <thead><tr><th>Booth</th><th>Partner</th><th></th></tr></thead>
        <tbody>
          {(booths || []).map((b) => (
            <tr key={b.id}>
              <td>{b.name || b.kabin_id}</td>
              <td className="sans" colSpan={2}>
                <form className="inline" action={assignBooth}>
                  <input type="hidden" name="booth_id" value={b.id} />
                  <select name="org_id" defaultValue={b.org_id || ""}>
                    <option value="">— own fleet (no partner) —</option>
                    {(orgs || []).map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                  <button className="ghost">Save</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
