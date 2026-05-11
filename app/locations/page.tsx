"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { Location } from "./MapComponent";
import "./locations.css";

const MapComponent = dynamic(() => import("./MapComponent"), { ssr: false });

const LOCATIONS: Location[] = [
  {
    id: 1,
    name: "PHOTOAUTOMAT Baross",
    address: "Baross u. 4, Budapest 1085",
    lat: 47.49527,
    lng: 19.07178,
    mapsUrl: "https://maps.app.goo.gl/Uqx3xf58NCErMfkv5",
    thumb: "https://lh3.googleusercontent.com/p/AF1QipOenMst9PQpTOK7Kb68o4y9xwOjqVAcFjprs96L=s1360-w1360-h1020-rw",
  },
  {
    id: 2,
    name: "PHOTOAUTOMAT Kazinczy",
    address: "Kazinczy u. 7, Budapest 1075",
    lat: 47.49875,
    lng: 19.06808,
    mapsUrl: "https://maps.app.goo.gl/LDMAjMzZyPKsa6j5A",
    thumb: "https://lh3.googleusercontent.com/p/AF1QipOEpBaKGXgx3awJcoNoVlxxhFbs3mAxtQ5xspL5=s1360-w1360-h1020-rw",
  },
  {
    id: 3,
    name: "PHOTOAUTOMAT Wesselényi",
    address: "Wesselényi utca 19, Budapest 1077",
    lat: 47.49932,
    lng: 19.06823,
    mapsUrl: "https://maps.app.goo.gl/nAfZZdWQjCkC7UCg8",
    thumb: "https://lh3.googleusercontent.com/p/AF1QipPDhEjo473ibm6g0jnsAIqLtijB4ZbyplT-LPCD=s1360-w1360-h1020-rw",
  },
  {
    id: 4,
    name: "PHOTOAUTOMAT Gozsdu",
    address: "Holló u. 10, Budapest 1075",
    lat: 47.49983,
    lng: 19.06385,
    mapsUrl: null,
    thumb: "/gozsdu.jpg",
    soon: true,
  },
];

const PHONE = "06703361957";

export default function LocationsPage() {
  const [activeId, setActiveId] = useState<number | null>(null);

  return (
    <div className="loc-root">
      {/* Header */}
      <header className="loc-header">
        <a href="/" className="loc-back">← BACK</a>
        <span className="loc-title">LOCATIONS</span>
        <span className="loc-city">Budapest</span>
      </header>

      <div className="loc-body">
        {/* LEFT — Card list */}
        <aside className="loc-sidebar">
          <p className="loc-count">{LOCATIONS.length} locations</p>

          {LOCATIONS.map((loc) => (
            <div
              key={loc.id}
              className={`loc-card ${activeId === loc.id ? "loc-card--active" : ""}`}
              onClick={() => setActiveId(activeId === loc.id ? null : loc.id)}
            >
              <div className="loc-thumb">
                <img src={loc.thumb} alt={loc.name} />
              </div>

              <div className="loc-info">
                <div className="loc-name-row">
                  <p className="loc-name">{loc.name}</p>
                  {loc.soon && <span className="loc-soon-badge">SOON</span>}
                </div>
                <p className="loc-addr">{loc.address}</p>
                <a href={`tel:${PHONE}`} className="loc-phone" onClick={(e) => e.stopPropagation()}>{PHONE}</a>
                {loc.mapsUrl ? (
                  <a
                    href={loc.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="loc-btn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    GET DIRECTIONS ↗
                  </a>
                ) : (
                  <span className="loc-btn loc-btn--soon">COMING SOON</span>
                )}
              </div>
            </div>
          ))}
        </aside>

        {/* RIGHT — Map */}
        <main className="loc-map-wrap">
          <MapComponent
            locations={LOCATIONS}
            activeId={activeId}
            onMarkerClick={(id) => setActiveId(activeId === id ? null : id)}
          />
        </main>
      </div>
    </div>
  );
}
