// Checkpoints 1 and 4 of 4: request => cdn edge (this file, a Cloudflare Worker
// deployed separately as Launch's edge function, checkpoint 1) => nginx => Lambda
// => app code's Middleware (proxy.ts, checkpoint 2) => actual page (route
// handlers, checkpoint 3) => response bubbles back through nginx => this file
// again, right before the response leaves edge for the browser (checkpoint 4).
// nginx itself isn't instrumented here — Launch owns that layer, not this app —
// but this file sits on both sides of it, so its request/response headers are
// nginx's input and output too.
const LAUNCH_HEADER_PREFIXES = ["x-launch-", "visitor-ip-"];

function isLaunchHeader(name) {
  const lower = name.toLowerCase();
  return LAUNCH_HEADER_PREFIXES.some((p) => lower.startsWith(p));
}

const toKB = (bytes) => Math.round((bytes / 1024) * 100) / 100;

// Mirrors lib/header-size.ts so every checkpoint's numbers are directly
// comparable: same "name: value\r\n" byte accounting, same launch/application
// split, same per-header ranking.
function computeHeaderSizeBreakdown(headers) {
  let launchHeaderBytes = 0;
  let applicationHeaderBytes = 0;
  const entries = [];

  for (const [name, value] of headers.entries()) {
    const bytes = name.length + value.length + 4; // "name: value\r\n"
    entries.push({ name, bytes });
    if (isLaunchHeader(name)) {
      launchHeaderBytes += bytes;
    } else {
      applicationHeaderBytes += bytes;
    }
  }

  entries.sort((a, b) => b.bytes - a.bytes);

  return {
    launchHeaderKB: toKB(launchHeaderBytes),
    applicationHeaderKB: toKB(applicationHeaderBytes),
    totalHeaderKB: toKB(launchHeaderBytes + applicationHeaderBytes),
    largestHeader: entries[0] ?? null,
    headers: entries,
  };
}

export default async function handler(request, _context) {
  console.log(JSON.stringify({ checkpoint: "edge-request", ...computeHeaderSizeBreakdown(request.headers) }));

  const response = await fetch(request);

  // What nginx + origin actually sent back, right before it leaves edge for the
  // browser. This is what the browser will store (e.g. as Set-Cookie) and later
  // echo back as request headers, so it's the other half of the CF1004 picture.
  console.log(JSON.stringify({ checkpoint: "edge-response", ...computeHeaderSizeBreakdown(response.headers) }));

  return response;
}
