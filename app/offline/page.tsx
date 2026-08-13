export const metadata = { title: "Você está offline — Fin" };

// Static navigation fallback served by the service worker (see public/sw.js)
// when a page request fails with no network. Deliberately outside the
// (app)/(auth) route groups — it must render with no auth check and no DB
// access, since neither is available offline.
export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-semibold">Você está offline</h1>
      <p className="max-w-xs text-sm text-foreground/60">
        Esta página ainda não foi carregada. Volte a se conectar à internet e tente novamente.
      </p>
    </main>
  );
}
