import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    useOffline: true,
  },
  async headers() {
    return [
      {
        // Never let a browser or CDN cache the service worker script itself
        // — clients must always fetch the latest version to pick up cache
        // logic changes (e.g. a new CACHE_VERSION).
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
