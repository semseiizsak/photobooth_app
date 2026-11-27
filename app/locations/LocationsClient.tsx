"use client";

import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import type { Location } from "./MapComponent";
import "./locations.css";

const MapComponent = dynamic(() => import("./MapComponent"), { ssr: false });

const PHONE = "06703361957";

export default function LocationsClient({
  locations: LOCATIONS,
  initialActiveId = null,
  banner,
}: {
  locations: Location[];
  initialActiveId?: number | null;
  banner?: ReactNode;
}) {
  const [activeId, setActiveId] = useState<number | null>(initialActiveId);

  return (
    <div className="loc-root">
      {/* Header */}
      <header className="loc-header">
        <a href="/" className="loc-back">← BACK</a>
        <span className="loc-title">LOCATIONS</span>
        <span className="loc-city">Budapest</span>
      </header>

      {banner}

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
                {loc.thumb
                  ? <img src={loc.thumb} alt={loc.name} />
                  : <div className="loc-thumb-placeholder" />}
              </div>

              <div className="loc-info">
                <p className="loc-name">{loc.name}</p>
                <p className="loc-addr">{loc.address}</p>
                <a href={`tel:${PHONE}`} className="loc-phone" onClick={(e) => e.stopPropagation()}>
                  {PHONE} <span className="loc-phone-note">ONLY WHATSAPP</span>
                </a>
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
                  <span className="loc-btn loc-btn--disabled">GET DIRECTIONS ↗</span>
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
