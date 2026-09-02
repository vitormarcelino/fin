// Service worker: installability + a real offline fallback for navigations.
//
// Privacy constraint this file is built around: Cache Storage is scoped per
// *origin*, not per signed-in user. This app is a personal finance tool
// that may run on a shared device, so we never cache or serve authenticated
// page HTML ((app)-group routes: dashboard, entries, tags) — a stale cached
// response could leak one user's financial data to whoever opens the app
// next after a logout. Only public/static content is cached:
//   - the static app shell assets Next.js hashes per build (_next/static/*)
//   - the manifest + icons
//   - /login and /offline, which render the same for everyone
//
// Non-GET requests (Server Actions, mutations) are never intercepted.

const CACHE_VERSION = "fin-v1";
const PRECACHE_URLS = ["/offline", "/login", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only ever handle safe, idempotent GETs — Server Actions and other
  // mutations must always hit the network untouched.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isStaticAsset(url)) {
    // Cache-first: these URLs are content-hashed by the Next.js build, so a
    // cached response is never stale.
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    // Network-first for page navigations. On failure, fall back only to the
    // precached, unauthenticated /offline page — never to a cached
    // authenticated route, which would risk showing stale financial data.
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline").then((res) => res ?? Response.error())),
    );
    return;
  }

  // Everything else (RSC data fetches, API calls, etc.) passes through
  // untouched — no caching, no offline fallback.
});

// Push notifications (iOS 16.4+ requires the app to be added to the home
// screen for this to fire at all). The payload is always our own JSON
// (see lib/push/send.ts) — never render untrusted push data.
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Fin", {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    }),
  );
});

// Focuses an already-open tab instead of always opening a new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow("/");
    }),
  );
});
