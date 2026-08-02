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
    // Skip Next internals and static files unless they appear in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // All API routes, including /api/upload: Clerk's `auth()` requires the
    // request to have passed through this proxy. Large upload bodies are safe
    // because `experimental.proxyClientMaxBodySize` in next.config.ts raises
    // the proxy's body-clone limit above the app's MAX_UPLOAD_BYTES.
    "/((?:api|trpc)(?:/.*)?)",
  ],
};
