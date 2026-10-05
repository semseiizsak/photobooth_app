import type { Metadata } from "next";
import "./legal.css";

export const metadata: Metadata = {
  title: "Legal – PHOTOAUTOMAT",
  robots: "noindex, nofollow",
};

const DOCS = [
  {
    title: "Adatkezelési Tájékoztató",
    description: "Általános adatkezelési tájékoztató",
    href: "/legal/adatkezelesi-tajekozato.pdf",
  },
  {
    title: "Adatkezelési Tájékoztató – Facebook",
    description: "Facebook-specifikus adatkezelési tájékoztató",
    href: "/legal/adatkezelesi-facebook.pdf",
  },
  {
    title: "Adatkezelési Tájékoztató – Instagram",
    description: "Instagram-specifikus adatkezelési tájékoztató",
    href: "/legal/adatkezelesi-instagram.pdf",
  },
  {
    title: "Használati Szabályzat és ÁSZF",
    description: "Photoautomat használati szabályzat és általános szerződési feltételek",
    href: "/legal/hasznalati-szabalyzat-aszf.pdf",
  },
];

export default function LegalPage() {
  return (
    <div className="legal-root">
      <header className="legal-header">
        <a href="/" className="legal-back">← BACK</a>
        <span className="legal-title">LEGAL</span>
      </header>

      <main className="legal-main">
        <p className="legal-company">Universal Moments Kft.</p>
        <ul className="legal-list">
          {DOCS.map((doc) => (
            <li key={doc.href} className="legal-item">
              <div className="legal-info">
                <p className="legal-doc-title">{doc.title}</p>
                <p className="legal-doc-desc">{doc.description}</p>
              </div>
              <a
                href={doc.href}
                target="_blank"
                rel="noopener noreferrer"
                className="legal-btn"
              >
                MEGNYITÁS ↗
              </a>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
