import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Access control for the fleet dashboards. The public site and all other
// routes are untouched; booth ingest (/api/ingest/*) authenticates with
// per-booth bearer tokens inside its route handlers.
//
//   /dashboard/*   admin — Basic auth against ADMIN_PASSWORD env
//   /org/<slug>/*  partner — Basic auth against that org's access_code
//                  (looked up via Supabase REST; edge-compatible fetch)

function unauthorized(realm: string) {
  return new NextResponse("Auth required", {
    status: 401,
    headers: { "WWW-Authenticate": `Basic realm="${realm}"` },
  });
}

function basicPassword(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Basic ")) return null;
  try {
    const idx = atob(auth.slice(6)).indexOf(":");
    return idx >= 0 ? atob(auth.slice(6)).slice(idx + 1) : null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) return NextResponse.next(); // not configured — open (local dev)
    if (basicPassword(req) === expected) return NextResponse.next();
    return unauthorized("PHOTOAUTOMAT FLEET");
  }

  if (pathname.startsWith("/org/")) {
    const slug = pathname.split("/")[2];
    if (!slug) return unauthorized("PHOTOAUTOMAT PARTNER");
    const pass = basicPassword(req);
    if (!pass) return unauthorized("PHOTOAUTOMAT PARTNER");
    try {
      const r = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/pb_organizations?slug=eq.${encodeURIComponent(slug)}&select=access_code`,
        {
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          cache: "no-store",
        }
      );
      const rows = await r.json();
      if (Array.isArray(rows) && rows[0]?.access_code && rows[0].access_code === pass)
        return NextResponse.next();
    } catch {
      /* fall through to 401 */
    }
    return unauthorized("PHOTOAUTOMAT PARTNER");
  }

  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/org/:path*"] };
