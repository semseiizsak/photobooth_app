import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// HTTP Basic auth for the booth-fleet dashboard only. The public site and
// every other route are untouched. Booth ingest (/api/ingest/*) authenticates
// with per-booth bearer tokens inside its route handlers instead.
export function middleware(req: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return NextResponse.next(); // not configured — open (local dev)

  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Basic ")) {
    const [, pass] = atob(auth.slice(6)).split(":");
    if (pass === expected) return NextResponse.next();
  }
  return new NextResponse("Auth required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="PHOTOAUTOMAT FLEET"' },
  });
}

export const config = { matcher: ["/dashboard/:path*"] };
