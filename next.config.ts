import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // The proxy clones request bodies so `auth()` (Clerk) can run on every
    // route — including /api/upload, which Clerk's auth() requires.
    proxyClientMaxBodySize: 50 * 1024 * 1024,
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
