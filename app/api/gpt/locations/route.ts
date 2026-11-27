import { NextResponse } from "next/server";
import {
  allLocations, authorized, fetchAndStorePhoto, firstFileUrl, googleMapsSearchUrl,
  insertLocation, normalizeName, publicView, resolveAddress, streetPart, updateLocation,
} from "@/lib/siteLocations";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const deny = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

// GET /api/gpt/locations — every location, any status.
export async function GET(req: Request) {
  if (!authorized(req)) return deny();
  const origin = new URL(req.url).origin;
  const rows = await allLocations();
  return NextResponse.json({ locations: rows.map((l) => publicView(l, origin)) });
}

// POST /api/gpt/locations — create a DRAFT. Nothing is public until it is
// published with PATCH { status: "live" }.
export async function POST(req: Request) {
  if (!authorized(req)) return deny();
  const origin = new URL(req.url).origin;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  const name = normalizeName(String(body.name ?? ""));
  const rawAddress = String(body.address ?? "").trim();
  const city = (typeof body.city === "string" && body.city.trim()) || "Budapest";
  if (!name || name.length > 80) return NextResponse.json({ error: "name is required (max 80 chars)" }, { status: 400 });
  if (!rawAddress || rawAddress.length > 160) return NextResponse.json({ error: "address is required" }, { status: 400 });

  const street = streetPart(rawAddress);
  const existing = (await allLocations()).find(
    (l) => streetPart(l.address).toLowerCase() === street.toLowerCase() && l.status !== "hidden"
  );
  if (existing)
    return NextResponse.json(
      { error: "a location with this address already exists", existing: publicView(existing, origin) },
      { status: 409 }
    );

  // Coordinates: explicit lat+lng win (postcode then comes from the caller),
  // otherwise geocode.
  let lat: number, lng: number, address: string, mapsUrl: string;
  let geocoded: string | null = null;
  if (body.lat != null && body.lng != null) {
    lat = Number(body.lat); lng = Number(body.lng);
    const pc = typeof body.postcode === "string" && /^\d{4}$/.test(body.postcode.trim()) ? body.postcode.trim() : null;
    address = pc ? `${street}, ${city} ${pc}` : `${street}, ${city}`;
    mapsUrl = googleMapsSearchUrl(street, city, pc);
  } else {
    const r = await resolveAddress(body);
    if ("error" in r) return NextResponse.json(r, { status: r.status });
    ({ lat, lng, address } = r);
    mapsUrl = r.maps_url;
    geocoded = r.geocoded_as;
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 45.7 || lat > 48.6 || lng < 16.1 || lng > 22.9)
    return NextResponse.json({ error: "coordinates are outside Hungary" }, { status: 422 });
  if (typeof body.maps_url === "string" && /^https:\/\//.test(body.maps_url)) mapsUrl = body.maps_url;

  let loc = await insertLocation({ name, address, lat, lng, maps_url: mapsUrl, thumb: null });

  let photoError: string | null = null;
  const fileUrl = firstFileUrl(body.openaiFileIdRefs);
  if (!fileUrl && Array.isArray(body.openaiFileIdRefs) && body.openaiFileIdRefs.length)
    photoError = "could not read the attached file — ask the user to attach the photo again";
  if (fileUrl) {
    try {
      loc = await updateLocation(loc.id, { thumb: await fetchAndStorePhoto(fileUrl, loc.id) });
    } catch (e) {
      photoError = (e as Error).message;
    }
  }

  return NextResponse.json(
    {
      location: publicView(loc, origin),
      geocoded_as: geocoded,
      photo: loc.thumb ? "saved" : photoError ? `failed: ${photoError}` : "missing — ask the user to attach a photo",
      next_step: "Show the preview_url to the user. Publish only after they confirm, with PATCH status=live.",
    },
    { status: 201 }
  );
}
