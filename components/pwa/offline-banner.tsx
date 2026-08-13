"use client";

import { useOffline } from "next/offline";

/** Connectivity banner shown on every route, per the next/offline guide. */
export function OfflineBanner() {
  const isOffline = useOffline();

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white"
    >
      Você está offline. As alterações serão enviadas quando a conexão voltar.
    </div>
  );
}
