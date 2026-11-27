import { timingSafeEqual } from "crypto";
import sharp from "sharp";
import { db } from "@/lib/pb";
import type { Location } from "@/app/locations/MapComponent";

// Public booth locations (/locations). Source of truth is the Supabase table
// pb_site_locations; the "Photoautomat locations" Custom GPT edits it through
// app/api/gpt/*. See docs/gpt-locations.md and db/site_locations.sql.

export type LocationStatus = "draft" | "live" | "hidden";

export interface SiteLocation {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  maps_url: string | null;
  thumb: string | null;
  status: LocationStatus;
  sort_order: number;
  preview_token: string;
  created_at: string;
  updated_at: string;
}

const TABLE = "pb_site_locations";
const BUCKET = "site-locations";
export const NAME_PREFIX = "PHOTOAUTOMAT";

export async function liveLocations(): Promise<SiteLocation[]> {
  const { data, error } = await db()
    .from(TABLE)
    .select("*")
    .eq("status", "live")
    .order("sort_order")
    .order("id");
  // Throwing keeps the previously generated page during ISR instead of
  // publishing an empty list.
  if (error) throw new Error(`pb_site_locations: ${error.message}`);
  return data as SiteLocation[];
}

export async function allLocations(): Promise<SiteLocation[]> {
  const { data, error } = await db().from(TABLE).select("*").order("sort_order").order("id");
  if (error) throw new Error(error.message);
  return data as SiteLocation[];
}

export async function locationById(id: number): Promise<SiteLocation | null> {
  const { data, error } = await db().from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as SiteLocation | null;
}

export async function locationByPreviewToken(token: string): Promise<SiteLocation | null> {
  if (!/^[0-9a-f]{32}$/.test(token)) return null;
  const { data, error } = await db().from(TABLE).select("*").eq("preview_token", token).maybeSingle();
  if (error) throw new Error(error.message);
  return data as SiteLocation | null;
}

export async function insertLocation(row: Partial<SiteLocation>): Promise<SiteLocation> {
  const { data: last } = await db()
    .from(TABLE).select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await db()
    .from(TABLE)
    .insert({ ...row, status: "draft", sort_order: (last?.sort_order ?? 0) + 1 })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as SiteLocation;
}

export async function updateLocation(id: number, patch: Partial<SiteLocation>): Promise<SiteLocation> {
  const { data, error } = await db()
    .from(TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as SiteLocation;
}

/** "Károly" / "photoautomat károly" → "PHOTOAUTOMAT Károly" */
export function normalizeName(raw: string): string {
  const rest = raw.trim().replace(/^photoautomat\b[\s:–-]*/i, "").trim();
  return rest ? `${NAME_PREFIX} ${rest.charAt(0).toUpperCase()}${rest.slice(1)}` : "";
}

// ---------------------------------------------------------------------------
// Auth: one shared secret, sent by the Custom GPT as "Authorization: Bearer".

export function authorized(req: Request): boolean {
  const expected = process.env.LOCATIONS_API_KEY;
  if (!expected || expected.length < 32) return false; // never open by accident
  const got = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Geocoding (OpenStreetMap Nominatim; ≤1 req/s, identifying User-Agent).

const ABBREVIATIONS: [RegExp, string][] = [
  [/\bkrt\.?(?=\s|,|$)/gi, "körút"],
  [/\bu\.(?=\s|,|$)/gi, "utca"],
  [/\bút\.?(?=\s|,|$)/gi, "út"],
  [/\bsgt\.?(?=\s|,|$)/gi, "sugárút"],
];

export interface GeocodeResult {
  lat: number;
  lng: number;
  postcode: string | null;
  city: string;
  display: string;
  /** true when the house number wasn't found and the pin is on the street. */
  approximate: boolean;
}

export type GeocodeOutcome =
  | { status: "ok"; result: GeocodeResult }
  | { status: "ambiguous"; candidates: GeocodeResult[] }
  | { status: "not_found" };

/** Budapest district from a postcode: 1075 → 7. */
const districtOf = (postcode: string | null) =>
  postcode && /^1\d{3}$/.test(postcode) ? Number(postcode.slice(1, 3)) : null;

/**
 * Many Budapest street names exist in several districts (Kazinczy utca is in
 * both VII and XV). If the hits fall in more than one postcode and the caller
 * gave neither postcode nor district, report them all so the user can choose.
 */
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV",
  "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI", "XXII", "XXIII"];

export async function geocode(
  street: string,
  city = "Budapest",
  hint: { postcode?: string; district?: number } = {}
): Promise<GeocodeOutcome> {
  let q = street;
  for (const [re, full] of ABBREVIATIONS) q = q.replace(re, full);

  const matchesHint = (c: GeocodeResult) =>
    hint.postcode ? c.postcode === hint.postcode : hint.district ? districtOf(c.postcode) === hint.district : true;

  let candidates = (await searchCandidates(q, `${q}, ${city}`, city)).filter(matchesHint);
  if (candidates.length === 0 && (hint.postcode || hint.district)) {
    // The general search ranks other districts first; ask again with the
    // district spelled out ("…, VII. kerület, Budapest").
    const area = hint.postcode ?? `${ROMAN[hint.district!]}. kerület`;
    await new Promise((r) => setTimeout(r, 1100)); // Nominatim: max 1 request/second
    candidates = (await searchCandidates(q, `${q}, ${area}, ${city}`, city)).filter(matchesHint);
  }

  if (candidates.length === 0) return { status: "not_found" };
  // Only a choice between different districts needs the user; several
  // postcodes inside one district (or a hint given) → take the best hit.
  const districts = new Set(candidates.map((c) => districtOf(c.postcode) ?? c.postcode));
  if (districts.size === 1 || hint.postcode || hint.district) return { status: "ok", result: candidates[0] };
  return { status: "ambiguous", candidates };
}

async function searchCandidates(q: string, query: string, city: string): Promise<GeocodeResult[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    countrycodes: "hu",
    limit: "10",
  }).toString();
  const r = await fetch(url, {
    headers: { "User-Agent": "photoautomat-site/1.0 (+https://www.photoautomat.hu)", "Accept-Language": "hu" },
    cache: "no-store",
  });
  if (!r.ok) return [];
  const all = (await r.json()) as Array<{
    lat: string; lon: string; display_name: string;
    address?: {
      postcode?: string; city?: string; town?: string; village?: string;
      road?: string; pedestrian?: string; square?: string; house_number?: string;
    };
  }>;

  // Nominatim pads results with near-misses (other house numbers, similar
  // streets). Keep only hits on the same street — and the same house number
  // when one was given — unless that leaves nothing.
  const fold = (s: string) => s.toLowerCase().normalize("NFC").trim();
  const wantRoad = fold(q.replace(/\s*\d.*$/, ""));
  const wantNo = q.match(/(\d+)/)?.[1] ?? null;
  const sameRoad = all.filter((h) => {
    const road = fold(h.address?.road || h.address?.pedestrian || h.address?.square || "");
    return road && (road === wantRoad || road.startsWith(wantRoad) || wantRoad.startsWith(road));
  });
  const sameHouse = wantNo ? sameRoad.filter((h) => (h.address?.house_number || "").match(/\d+/)?.[0] === wantNo) : sameRoad;
  // No exact house → street-level position, flagged so the user can check the pin.
  const approximate = !!wantNo && sameHouse.length === 0;
  const hits = sameHouse.length ? sameHouse : sameRoad;

  // Most relevant hit per postcode.
  const byPostcode = new Map<string, GeocodeResult>();
  for (const h of hits) {
    const postcode = h.address?.postcode ?? null;
    const key = postcode ?? "?";
    if (byPostcode.has(key)) continue;
    byPostcode.set(key, {
      lat: Math.round(Number(h.lat) * 1e6) / 1e6,
      lng: Math.round(Number(h.lon) * 1e6) / 1e6,
      postcode,
      city: h.address?.city || h.address?.town || h.address?.village || city,
      display: h.display_name,
      approximate,
    });
  }
  return [...byPostcode.values()];
}

/** Street part as the user wrote it, e.g. "Károly krt. 17" from "Károly krt. 17., Budapest". */
export function streetPart(address: string): string {
  return address.split(",")[0].trim().replace(/\.$/, "");
}

export function googleMapsSearchUrl(street: string, city: string, postcode?: string | null): string {
  const q = postcode ? `${street}, ${postcode} ${city}` : `${street}, ${city}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Shared by create and update: resolve an address to coordinates or explain why not. */
export async function resolveAddress(body: Record<string, unknown>) {
  const street = streetPart(String(body.address ?? ""));
  const city = (typeof body.city === "string" && body.city.trim()) || "Budapest";
  const postcode = typeof body.postcode === "string" && /^\d{4}$/.test(body.postcode.trim()) ? body.postcode.trim() : undefined;
  const district = Number.isInteger(Number(body.district)) && Number(body.district) >= 1 && Number(body.district) <= 23
    ? Number(body.district) : undefined;

  const g = await geocode(street, city, { postcode, district });
  if (g.status === "not_found")
    return { error: "address not found on the map — ask for the exact street + house number (and district), or pass lat/lng", status: 422 } as const;
  if (g.status === "ambiguous")
    return {
      error: "this street exists in more than one district — ask the user which one, then call again with postcode",
      candidates: g.candidates.map((c) => ({ postcode: c.postcode, district: districtOf(c.postcode), place: c.display })),
      status: 409,
    } as const;
  const pc = postcode ?? g.result.postcode;
  return {
    street, city,
    address: pc ? `${street}, ${city} ${pc}` : `${street}, ${city}`,
    lat: g.result.lat, lng: g.result.lng,
    maps_url: googleMapsSearchUrl(street, city, pc),
    geocoded_as: g.result.approximate
      ? `APPROXIMATE (house number not on the map, pin is on the street — ask the user to check it in the preview): ${g.result.display}`
      : g.result.display,
  } as const;
}

// ---------------------------------------------------------------------------
// Photos: downloaded from the ChatGPT file link, resized like the hand-made
// thumbs (≤1200 px long side, JPEG q80, EXIF rotation baked in).

const MAX_DOWNLOAD = 25 * 1024 * 1024;

/** Custom GPT Actions send openaiFileIdRefs as objects; tolerate bare URLs too. */
export function firstFileUrl(refs: unknown): string | null {
  if (!Array.isArray(refs) || refs.length === 0) return null;
  const f = refs[0] as unknown;
  if (typeof f === "string") return /^https:\/\//.test(f) ? f : null;
  if (f && typeof f === "object") {
    const o = f as Record<string, unknown>;
    const u = o.download_link ?? o.download_url;
    return typeof u === "string" && /^https:\/\//.test(u) ? u : null;
  }
  return null;
}

export async function fetchAndStorePhoto(fileUrl: string, locationId: number): Promise<string> {
  const u = new URL(fileUrl);
  if (u.protocol !== "https:" || /^(localhost|\d+\.\d+\.\d+\.\d+|\[.*\])$/i.test(u.hostname))
    throw new Error("photo link must be a public https URL");

  const r = await fetch(u, { cache: "no-store", redirect: "follow" });
  if (!r.ok) throw new Error(`could not download photo (HTTP ${r.status}) — the link may have expired, attach it again`);
  const len = Number(r.headers.get("content-length") || 0);
  if (len > MAX_DOWNLOAD) throw new Error("photo is larger than 25 MB");
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > MAX_DOWNLOAD) throw new Error("photo is larger than 25 MB");

  let jpeg: Buffer;
  try {
    jpeg = await sharp(buf, { failOn: "error" })
      .rotate()
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
  } catch {
    throw new Error("the attachment is not a readable image — send a JPEG or PNG photo");
  }

  const path = `${locationId}-${Date.now()}.jpg`;
  const sb = db();
  const { error } = await sb.storage.from(BUCKET).upload(path, jpeg, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(`photo upload failed: ${error.message}`);
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Remove a previous photo if it lives in our bucket (public/ thumbs are left alone). */
export async function deleteStoredPhoto(thumb: string | null) {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  if (!thumb || !thumb.includes(marker)) return;
  await db().storage.from(BUCKET).remove([thumb.split(marker)[1]]);
}

export function toLocation(l: SiteLocation): Location {
  return { id: l.id, name: l.name, address: l.address, lat: l.lat, lng: l.lng, mapsUrl: l.maps_url, thumb: l.thumb };
}

// ---------------------------------------------------------------------------

export function publicView(loc: SiteLocation, origin: string) {
  return {
    id: loc.id,
    name: loc.name,
    address: loc.address,
    lat: loc.lat,
    lng: loc.lng,
    maps_url: loc.maps_url,
    photo_url: loc.thumb && loc.thumb.startsWith("/") ? origin + loc.thumb : loc.thumb,
    status: loc.status,
    preview_url: `${origin}/locations/preview/${loc.preview_token}`,
    updated_at: loc.updated_at,
  };
}
