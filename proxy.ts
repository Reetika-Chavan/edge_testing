import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { computeHeaderSizeBreakdown } from "@/lib/header-size";

// Checkpoint 2 of 4: request => cdn edge (functions/[proxy].edge.js, checkpoint
// 1 — a separate Cloudflare Worker deployment, which proxy has no way to reach
// into) => nginx => Lambda => this file, the app code's Middleware, which runs
// before any route/page => actual page (route handlers, checkpoint 3) => back
// through nginx => cdn edge again on the way out (checkpoint 4).
// This is the earliest point inside this Next.js process itself, so it's the
// single place request-header arrival gets logged for every /cf1004-test/*
// request, instead of each route handler logging it separately.
export function proxy(request: NextRequest) {
  console.log(JSON.stringify({
    checkpoint: "middleware",
    ...computeHeaderSizeBreakdown(request.headers),
  }));

  return NextResponse.next();
}

export const config = {
  matcher: ["/cf1004-test", "/cf1004-test/:path*"],
};
