import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit .next/standalone with only the traced files/deps needed to run
  // `node server.js` — no node_modules or source copied into the runtime
  // Docker image. See Dockerfile.
  output: "standalone",
  experimental: {
    useOffline: true,
    serverActions: {
      // Default is 1MB; the history-import Server Action accepts an
      // uploaded CSV/XLSX file, which can exceed that.
      bodySizeLimit: "5mb",
    },
  },
  allowedDevOrigins: [
    "highly-novel-lab.ngrok-free.app",
  ],
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
