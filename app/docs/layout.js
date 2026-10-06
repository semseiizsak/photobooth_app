import "../dashboard/pb.css";
import Link from "next/link";

export const metadata = { title: "PHOTOAUTOMAT — DOCS" };

export default function DocsLayout({ children }) {
  return (
    <div className="pbd">
      <div className="wrap" style={{ maxWidth: 860 }}>
        <header className="site">
          <h1><Link href="/software">PHOTOAUTOMAT</Link></h1>
          <nav>
            <Link href="/docs">Docs</Link>
            <Link href="/docs/quickstart">Quickstart</Link>
            <Link href="/docs/hardware">Hardware</Link>
            <a href="mailto:info@photoautomat.hu">Support</a>
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
