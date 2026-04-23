"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface Location {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  mapsUrl: string;
}

interface MapComponentProps {
  locations: Location[];
  activeId: number | null;
  onMarkerClick: (id: number) => void;
}

const customIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:28px;height:28px;
    background:#000;
    border:3px solid #fff;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    box-shadow:0 2px 8px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -30],
});

const activeIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:36px;height:36px;
    background:#000;
    border:3px solid #000;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    box-shadow:0 3px 12px rgba(0,0,0,0.6);
    outline:3px solid #fff;
    outline-offset:1px;
  "></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -38],
});

export default function MapComponent({ locations, activeId, onMarkerClick }: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<number, L.Marker>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [47.4995, 19.069],
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    locations.forEach((loc) => {
      const marker = L.marker([loc.lat, loc.lng], { icon: customIcon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:system-ui;font-weight:700;font-size:13px;line-height:1.5">
            <div style="text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">${loc.name.replace("PHOTOAUTOMAT ", "")}</div>
            <div style="font-weight:400;font-size:12px;color:#555">${loc.address}</div>
            <a href="${loc.mapsUrl}" target="_blank" rel="noopener noreferrer"
              style="display:inline-block;margin-top:8px;padding:4px 10px;background:#000;color:#fff;text-decoration:none;font-size:11px;border-radius:4px;letter-spacing:0.08em">
              MAPS ↗
            </a>
          </div>`,
          { maxWidth: 200 }
        );

      marker.on("click", () => onMarkerClick(loc.id));
      markersRef.current[loc.id] = marker;
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    Object.entries(markersRef.current).forEach(([idStr, marker]) => {
      const id = parseInt(idStr);
      if (id === activeId) {
        marker.setIcon(activeIcon);
        marker.openPopup();
        mapRef.current!.panTo(marker.getLatLng(), { animate: true });
      } else {
        marker.setIcon(customIcon);
        marker.closePopup();
      }
    });
  }, [activeId]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
