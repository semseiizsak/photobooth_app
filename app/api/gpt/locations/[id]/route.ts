import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  authorized, deleteStoredPhoto, fetchAndStorePhoto, firstFileUrl, googleMapsSearchUrl,
  locationById, normalizeName, publicView, resolveAddress, streetPart, updateLocation,
  type LocationStatus, type SiteLocation,
} from "@/lib/siteLocations";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STATUSES: LocationStatus[] = ["draft", "live", "hidden"];

async function load(req: Request, params: Promise<{ id: string }>) {
  if (!authorized(req)) return { res: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  const id = Number((await params).id);
  const loc = Number.isInteger(id) ? await locationById(id) : null;
  if (!loc) return { res: NextResponse.json({ error: "location not found" }, { status: 404 }) };
  return { loc };
}

// GET /api/gpt/locations/{id}
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { res, loc } = await load(req, params);
  if (res) return res;
  return NextResponse.json({ location: publicView(loc!, new URL(req.url).origin) });
}

// PATCH /api/gpt/locations/{id} — change fields, replace the photo, or change
// status (draft → live publishes; live → hidden takes it off the site).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { res, loc } = await load(req, params);
  if (res) return res;
  const origin = new URL(req.url).origin;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  const patch: Partial<SiteLocation> = {};

  if (typeof body.name === "string") {
    const name = normalizeName(body.name);
    if (!name || name.length > 80) return NextResponse.json({ error: "invalid name" }, { status: 400 });
    patch.name = name;
  }

  const manualCoords = body.lat != null || body.lng != null;

  if (typeof body.address === "string" && body.address.trim()) {
    const street = streetPart(body.address);
    const city = (typeof body.city === "string" && body.city.trim()) || "Budapest";
    if (manualCoords) {
      const pc = typeof body.postcode === "string" && /^\d{4}$/.test(body.postcode.trim()) ? body.postcode.trim() : null;
      patch.address = pc ? `${street}, ${city} ${pc}` : `${street}, ${city}`;
      patch.maps_url = googleMapsSearchUrl(street, city, pc);
    } else {
      const r = await resolveAddress(body);
      if ("error" in r) return NextResponse.json(r, { status: r.status });
      patch.address = r.address; patch.lat = r.lat; patch.lng = r.lng; patch.maps_url = r.maps_url;
    }
  }

  if (manualCoords) {
    const lat = Number(body.lat), lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 45.7 || lat > 48.6 || lng < 16.1 || lng > 22.9)
      return NextResponse.json({ error: "lat and lng must both be given and be inside Hungary" }, { status: 400 });
    patch.lat = lat; patch.lng = lng;
  }

  if (typeof body.maps_url === "string") {
    if (!/^https:\/\//.test(body.maps_url)) return NextResponse.json({ error: "maps_url must be https" }, { status: 400 });
    patch.maps_url = body.maps_url;
  }

  const fileUrl = firstFileUrl(body.openaiFileIdRefs);
  if (!fileUrl && Array.isArray(body.openaiFileIdRefs) && body.openaiFileIdRefs.length)
    return NextResponse.json({ error: "could not read the attached file — ask the user to attach the photo again" }, { status: 422 });
  if (fileUrl) {
    try {
      patch.thumb = await fetchAndStorePhoto(fileUrl, loc!.id);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 422 });
    }
  }

  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status as LocationStatus))
      return NextResponse.json({ error: "status must be draft, live or hidden" }, { status: 400 });
    const next = body.status as LocationStatus;
    if (next === "live" && !(patch.thumb ?? loc!.thumb))
      return NextResponse.json({ error: "cannot publish without a photo — attach one first" }, { status: 422 });
    patch.status = next;
  }

  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "nothing to change" }, { status: 400 });

  const updated = await updateLocation(loc!.id, patch);
  if (patch.thumb && loc!.thumb !== patch.thumb) await deleteStoredPhoto(loc!.thumb).catch(() => {});

  // Anything that was or now is live changes the public page.
  if (loc!.status === "live" || updated.status === "live") revalidatePath("/locations");

  return NextResponse.json({
    location: publicView(updated, origin),
    public_page: updated.status === "live" ? `${origin}/locations` : null,
  });
}
