"use client";

import { useEffect, useState } from "react";

type Status = "idle" | "loading" | "error";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

/**
 * Push notification opt-in + validation button, for Settings. Registering
 * for push (and receiving anything) on iOS requires the PWA to already be
 * added to the home screen (Safari 16.4+) — Web Push doesn't work in a
 * regular Safari tab there.
 *
 * Only meaningful against a production build: sw-register.tsx doesn't
 * register the service worker in dev, so there's nothing here to subscribe
 * against until `next build && next start` (or a real deploy).
 */
export function PushManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    navigator.serviceWorker.ready.then((registration) => {
      setIsSupported(true);
      registration.pushManager.getSubscription().then(setSubscription);
    });
  }, []);

  async function subscribe() {
    setStatus("loading");
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("error");
        setMessage("Permissão de notificação negada.");
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        setStatus("error");
        setMessage("Notificações não configuradas no servidor.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("Falha ao registrar inscrição.");

      setSubscription(sub);
      setStatus("idle");
    } catch {
      setStatus("error");
      setMessage("Não foi possível ativar as notificações.");
    }
  }

  async function unsubscribe() {
    if (!subscription) return;
    setStatus("loading");
    setMessage(null);
    try {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
      setSubscription(null);
      setStatus("idle");
    } catch {
      setStatus("error");
      setMessage("Não foi possível desativar as notificações.");
    }
  }

  async function sendTest() {
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao enviar.");
      const reasons = data.errors?.length ? ` (${data.errors.join("; ")})` : "";
      setMessage(`Enviado: ${data.sent} ok, ${data.failed} falhas${reasons}.`);
      setStatus(data.failed > 0 ? "error" : "idle");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Falha ao enviar notificação de teste.");
    }
  }

  if (!isSupported) {
    return (
      <div className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-transparent">
        <p className="text-[15px] font-medium text-slate-900 dark:text-foreground">Notificações</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-foreground/60">
          Não suportado neste navegador. No iPhone, adicione o app à tela de início primeiro
          (Compartilhar → Adicionar à Tela de Início) e abra por lá.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-transparent">
      <div>
        <p className="text-[15px] font-medium text-slate-900 dark:text-foreground">Notificações</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-foreground/60">
          {subscription
            ? "Ativadas neste dispositivo."
            : "Ative para receber notificações neste dispositivo."}
        </p>
      </div>

      <div className="flex gap-2">
        {subscription ? (
          <button
            type="button"
            onClick={unsubscribe}
            disabled={status === "loading"}
            className="h-10 flex-1 rounded-xl border border-black/10 text-sm font-medium active:opacity-70 disabled:opacity-60 dark:border-white/15"
          >
            Desativar
          </button>
        ) : (
          <button
            type="button"
            onClick={subscribe}
            disabled={status === "loading"}
            className="h-10 flex-1 rounded-xl bg-foreground text-sm font-medium text-background active:opacity-80 disabled:opacity-60"
          >
            Ativar
          </button>
        )}

        {subscription ? (
          <button
            type="button"
            onClick={sendTest}
            disabled={status === "loading"}
            className="h-10 flex-1 rounded-xl border border-black/10 text-sm font-medium active:opacity-70 disabled:opacity-60 dark:border-white/15"
          >
            Testar
          </button>
        ) : null}
      </div>

      {message ? (
        <p className={`text-xs ${status === "error" ? "text-red-600 dark:text-red-400" : "text-foreground/60"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
