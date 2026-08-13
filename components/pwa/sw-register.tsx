"use client";

import { useEffect } from "react";

/** Registers the service worker (public/sw.js) once the app has mounted. */
export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability degrades gracefully — offline fallback and asset
      // caching just won't be available, the app itself still works.
    });
  }, []);

  return null;
}
