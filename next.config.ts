import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // The proxy clones request bodies so `auth()` (Clerk) can run on every
    // route — including /api/upload, which Clerk's auth() requires. The
    // default clone limit is 10MB, which truncated large file uploads into
    // HTTP 413s. Raised above the app's own MAX_UPLOAD_BYTES (25MB) so the
    // route's own size check stays the single source of truth.
    proxyClientMaxBodySize: 50 * 1024 * 1024,
  },
};

export default nextConfig;
