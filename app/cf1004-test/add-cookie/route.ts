import { NextRequest, NextResponse } from "next/server";
import { computeHeaderSizeBreakdown } from "@/lib/header-size";

const COOKIE_PREFIX = "cf1004_";
const CHUNK_BYTES = 1000; // 1KB per cookie
const DEFAULT_TARGET_KB = 5.0;

// request.url reflects the origin's internal address behind Launch's proxy, not
// the public domain the browser used, so redirects must be built from the
// forwarded host instead.
function publicOrigin(request: NextRequest) {
  const proto =
    request.headers.get("x-forwarded-proto") ??
    request.nextUrl.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host;
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const existing = request.cookies
    .getAll()
    .filter((c) => c.name.startsWith(COOKIE_PREFIX));

  const requestedKB = Number(request.nextUrl.searchParams.get("kb"));
  const targetKB =
    Number.isFinite(requestedKB) && requestedKB > 0
      ? requestedKB
      : DEFAULT_TARGET_KB;
  const totalFillerBytes = Math.round(targetKB * 1000);

  const response = NextResponse.redirect(
    new URL("/cf1004-test", publicOrigin(request)),
  );
  for (const cookie of existing) {
    response.cookies.delete(cookie.name);
  }
  let remainingBytes = totalFillerBytes;
  let i = 0;
  while (remainingBytes > 0) {
    const chunkBytes = Math.min(CHUNK_BYTES, remainingBytes);
    response.cookies.set(`${COOKIE_PREFIX}${i}`, "x".repeat(chunkBytes), {
      path: "/",
      sameSite: "lax",
    });
    remainingBytes -= chunkBytes;
    i++;
  }

  // Checkpoint 3 of 4: the actual page/route handler, right before the response
  // is sent back through Lambda => nginx => cdn edge (checkpoint 4, see
  // functions/[proxy].edge.js) => browser. App Router page components (page.tsx)
  // never see their own finalized response headers — only code that builds a
  // NextResponse directly, like this route handler, can log them. This is also
  // where the large Set-Cookie headers driving the CF1004 repro actually
  // originate, so it's the most useful place to log response size.
  console.log(JSON.stringify({
    checkpoint: "page",
    ...computeHeaderSizeBreakdown(response.headers),
  }));

  return response;
}
