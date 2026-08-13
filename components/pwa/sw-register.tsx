"use client";

import { useEffect } from "react";

/** Registers the service worker (public/sw.js) once the app has mounted.
 *
 *  Production only. sw.js cache-firsts everything under /_next/static/,
 *  on the assumption that those filenames are content-hashed and can
 *  never go stale — true for a `next build`, not for `next dev`/Turbopack.
 *  Registering it in dev pins the browser to whatever JS chunks existed
 *  at the first page load, while every later edit keeps SSR-ing fresh
 *  markup from the running dev server: client and server drift apart and
 *  React throws a hydration mismatch that looks like a real bug but is
 *  just the SW serving yesterday's bundle. */
export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // Tear down any registration + cache left over from before this
      // guard existed (or from a production build once served from this
      // same origin/port). Unregistering here doesn't release control of
      // *this* already-loaded tab, but it does mean the next reload loads
      // with no service worker in the way — no manual DevTools step needed.
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability degrades gracefully — offline fallback and asset
      // caching just won't be available, the app itself still works.
    });
  }, []);

  return null;
}
