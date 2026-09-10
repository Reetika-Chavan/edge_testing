import { NextRequest, NextResponse } from "next/server";
import { computeHeaderSizeBreakdown } from "@/lib/header-size";

const COOKIE_PREFIX = "cf1004_";

// request.url reflects the origin's internal address behind Launch's proxy, not
// the public domain the browser used, so redirects must be built from the
// forwarded host instead.
function publicOrigin(request: NextRequest) {
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const existing = request.cookies.getAll().filter((c) => c.name.startsWith(COOKIE_PREFIX));
  const response = NextResponse.redirect(new URL("/cf1004-test", publicOrigin(request)));
  for (const cookie of existing) {
    response.cookies.delete(cookie.name);
  }

  // Checkpoint 3 of 4 — see add-cookie/route.ts for why the response-header
  // checkpoint lives in route handlers instead of page.tsx.
  console.log(JSON.stringify({
    checkpoint: "page",
    ...computeHeaderSizeBreakdown(response.headers),
  }));

  return response;
}
