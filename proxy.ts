import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { computeHeaderSizeBreakdown } from "@/lib/header-size";

// Runs on origin compute, after Launch's edge function (a separate
// Cloudflare Worker deployment — see functions/[proxy].edge.js for that
// "edge" checkpoint, which proxy has no way to reach into) and nginx have
// already processed the request. This is the earliest point inside this
// Next.js process itself, so it's the single place "origin" arrival gets
// logged for every /cf1004-test/* request, instead of each route handler
// logging it separately.
export function proxy(request: NextRequest) {
  console.log(JSON.stringify({
    checkpoint: "origin",
    ...computeHeaderSizeBreakdown(request.headers),
  }));

  return NextResponse.next();
}

export const config = {
  matcher: ["/cf1004-test", "/cf1004-test/:path*"],
};
