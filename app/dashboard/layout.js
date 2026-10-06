import "./pb.css";
import Link from "next/link";

export const metadata = {
  title: "PHOTOAUTOMAT — FLEET",
  description: "Booth fleet dashboard",
};

export default function DashboardLayout({ children }) {
  return (
    <div className="pbd">
      <div className="wrap">
        <header className="site">
          <h1>
            <Link href="/dashboard">PHOTOAUTOMAT</Link>
          </h1>
          <nav>
            <Link href="/dashboard">Fleet</Link>
            <Link href="/dashboard/errors">Errors</Link>
            <Link href="/dashboard/revenue">Revenue</Link>
            <Link href="/dashboard/licenses">Licenses</Link>
            <Link href="/dashboard/orgs">Partners</Link>
            <Link href="/dashboard/leads">Leads</Link>
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
