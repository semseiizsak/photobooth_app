import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { liveLocations, locationByPreviewToken, toLocation } from "@/lib/siteLocations";
import LocationsClient from "../../LocationsClient";

// Private preview of one location (any status) on the real locations page,
// reachable only through its unguessable preview_token. Used by the Custom GPT
// before publishing.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

const STATUS_TEXT = {
  draft: "DRAFT — NOT ON THE SITE YET",
  hidden: "HIDDEN — NOT ON THE SITE",
  live: "LIVE — THIS LOCATION IS ON THE SITE",
} as const;

export default async function LocationPreviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const target = await locationByPreviewToken(token);
  if (!target) notFound();

  const live = await liveLocations();
  const list = live.some((l) => l.id === target.id) ? live : [...live, target];

  return (
    <LocationsClient
      locations={list.map(toLocation)}
      initialActiveId={target.id}
      banner={
        <div
          style={{
            background: target.status === "live" ? "#1db954" : "#000",
            color: "#fff",
            padding: "10px 16px",
            fontSize: 12,
            letterSpacing: "0.12em",
            fontWeight: 700,
          }}
        >
          PREVIEW · {target.name.toUpperCase()} · {STATUS_TEXT[target.status]}
        </div>
      }
    />
  );
}
