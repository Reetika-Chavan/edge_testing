# edgetesting

Scratch Next.js app for diagnosing Contentstack Launch's `CF1004` error
([request header exceeds size limit](https://www.contentstack.com/docs/launch/troubleshooting-launch-response-error-codes#request-header-exceeds-size-limit-cf1004)).

Launch doesn't log raw request/response header content for security reasons, so
when a customer hits CF1004 there's no way to see which header is actually
oversized. This app fills that gap: deploy it on Launch and it logs header
**sizes** (never values, except test-cookie filler which is synthetic) at every
hop a request/response passes through, so the log output can be handed
directly to a customer or checked against their own report.

## Request/response flow being instrumented

```
request => cdn edge => nginx => Lambda => app code's Middleware => actual page/route handler
                                                                              |
browser <= cdn edge <= nginx <====================================================
```

| # | Stage | Direction | File | Logs |
|---|-------|-----------|------|------|
| 1 | CDN edge (Launch's edge function, a separate Cloudflare Worker deployment) | request in | [`functions/[proxy].edge.js`](functions/[proxy].edge.js) | incoming request header size |
| — | nginx | both | *(not instrumented — owned by Launch, not this app)* | — |
| 2 | Middleware (Next.js Proxy, runs before any route) | request in | [`proxy.ts`](proxy.ts) | incoming request header size |
| 3 | Actual page / route handler, right before the response is sent | response out | [`app/cf1004-test/add-cookie/route.ts`](app/cf1004-test/add-cookie/route.ts), [`app/cf1004-test/clear/route.ts`](app/cf1004-test/clear/route.ts) | outgoing response header size |
| 4 | CDN edge again, right before the response leaves edge for the browser | response out | [`functions/[proxy].edge.js`](functions/[proxy].edge.js) | outgoing response header size (what nginx + origin actually sent back) |

Checkpoint 3 lives in the Route Handlers, not `page.tsx`: App Router page
components don't have access to their own finalized response headers, only
code that builds a `NextResponse` directly does. It's also where this app's
oversized headers actually originate (as `Set-Cookie`), so it's the most
useful place to log response size.

Checkpoint 4 exists because checkpoints 1-3 only cover the *request* path —
what the origin/route handler sends back (checkpoint 3) still has to cross
nginx and edge again before it reaches the browser, and it's exactly that
outgoing `Set-Cookie` the browser will store and later echo back as the
oversized `Cookie` request header that trips CF1004 on the next hit.

Each checkpoint logs a single JSON line:

```json
{"checkpoint":"edge-request","launchHeaderKB":0.9,"applicationHeaderKB":5.1,"totalHeaderKB":6.0,"largestHeader":{"name":"cookie","bytes":5120},"headers":[...]}
```

- `launchHeaderKB` / `applicationHeaderKB` split headers Launch itself attaches
  (`x-launch-*`, `visitor-ip-*`) from everything else (browser, Next.js
  app, customer's own headers), per byte accounting of `name: value\r\n`.
- `largestHeader` / `headers` rank every header by size, so the biggest
  contributor is immediately visible.
- The same `computeHeaderSizeBreakdown` logic (mirrored between
  [`lib/header-size.ts`](lib/header-size.ts) and the edge function, since the
  edge function runs in a separate Cloudflare Worker deployment that can't
  import from this repo) is used at every checkpoint so numbers are directly
  comparable across them.

## Reproducing CF1004

`/cf1004-test` sets its own oversized `Cookie`/`Set-Cookie` header via test
cookies (`cf1004_*`), instead of relying on a real customer request, so the
repro is self-contained:

1. Deploy this project on Contentstack Launch.
2. Visit `/cf1004-test` and use the links to set the Cookie header to a given
   size (stays under the threshold that trips CF1004 here, so every request
   still reaches origin and every checkpoint logs).
3. Check the checkpoint logs in the Launch dashboard for each request to see
   the header size breakdown at every hop.

## Getting started locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
