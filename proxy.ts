import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Session context + security headers.
 *
 * Deliberately does NOT gate routes by path. Clerk 7 deprecated
 * `createRouteMatcher` because path matching can diverge from how Next actually
 * resolves routes, which leaves protected resources reachable. Authorization
 * instead lives next to the data it protects:
 *   - `app/(dashboard)/layout.tsx` redirects when there's no DB user
 *   - Server Actions call `requireUser()` / `requireProjectRole()`
 *   - Route handlers verify their own credentials
 *
 * Named `proxy.ts` — Next 16 renamed the `middleware` file convention.
 */
export default clerkMiddleware(async () => {
  const res = NextResponse.next();

  // Defense-in-depth headers. CSP is intentionally omitted here because Clerk
  // and Supabase inject scripts/frames whose hosts vary by deployment; set it
  // in next.config.ts where the allowlist can be reviewed as a whole.
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-DNS-Prefetch-Control", "off");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(self), geolocation=(), interest-cohort=()"
  );

  return res;
});

export const config = {
  matcher: [
    // Skip Next internals, the upload API (see below), and static files unless
    // they appear in search params.
    "/((?!_next|api/upload|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // All API routes — except /api/upload. Running the proxy there would force
    // Next.js to buffer the request body (10MB hard limit) so the proxy could
    // re-read it, which silently truncates large file uploads and fails with
    // HTTP 413. The upload route authenticates itself with Clerk's auth() and
    // only returns JSON, so the proxy's security headers add nothing to it.
    "/((?!api/upload)(?:api|trpc)(?:/.*)?)",
  ],
};
