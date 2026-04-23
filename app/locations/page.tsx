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
    lat: 47.4964,
    lng: 19.0724,
    mapsUrl: "https://maps.app.goo.gl/Uqx3xf58NCErMfkv5",
  },
  {
    id: 2,
    name: "PHOTOAUTOMAT Kazinczy",
    address: "Kazinczy u. 7, Budapest 1075",
    lat: 47.4997,
    lng: 19.0676,
    mapsUrl: "https://maps.app.goo.gl/LDMAjMzZyPKsa6j5A",
  },
  {
    id: 3,
    name: "PHOTOAUTOMAT Wesselényi",
    address: "Wesselényi utca 19, Budapest 1077",
    lat: 47.5001,
    lng: 19.0667,
    mapsUrl: "https://maps.app.goo.gl/nAfZZdWQjCkC7UCg8",
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
              {/* Thumbnail placeholder */}
              <div className="loc-thumb">
                <svg viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="80" height="60" fill="#111" />
                  {/* Booth outline */}
                  <rect x="28" y="8" width="24" height="44" rx="2" stroke="#fff" strokeWidth="1.5" fill="none" />
                  {/* Screen */}
                  <rect x="32" y="13" width="16" height="18" rx="1" fill="#333" stroke="#fff" strokeWidth="1" />
                  {/* Slot */}
                  <rect x="33" y="37" width="14" height="3" rx="1" fill="#444" stroke="#aaa" strokeWidth="0.8" />
                  {/* Button */}
                  <circle cx="40" cy="46" r="3" fill="#fff" />
                  {/* Curtain sides */}
                  <rect x="10" y="14" width="16" height="34" rx="1" fill="#222" stroke="#555" strokeWidth="1" />
                  <rect x="54" y="14" width="16" height="34" rx="1" fill="#222" stroke="#555" strokeWidth="1" />
                </svg>
              </div>

              <div className="loc-info">
                <p className="loc-name">{loc.name}</p>
                <p className="loc-addr">{loc.address}</p>
                <p className="loc-phone">{PHONE}</p>
                <a
                  href={loc.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="loc-btn"
                  onClick={(e) => e.stopPropagation()}
                >
                  GET DIRECTIONS ↗
                </a>
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
