import "server-only";

import webpush from "web-push";
import type { PushSubscription as StoredPushSubscription } from "@/lib/db/schema";
import { deletePushSubscriptionByEndpoint } from "@/lib/push/queries";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT;

// Only configured once per server process. Missing keys just means push is
// disabled — sendPushNotification below reports that explicitly rather than
// throwing, so the rest of the app never has to know push is unconfigured.
const isConfigured = Boolean(publicKey && privateKey && subject);
if (isConfigured) {
  webpush.setVapidDetails(subject!, publicKey!, privateKey!);
}

export type PushPayload = {
  title: string;
  body: string;
};

export type PushSendResult =
  | { ok: true }
  | { ok: false; error: string; statusCode?: number; body?: string; gone: boolean };

/**
 * Sends a single push notification via the browser's push service. On a
 * 404/410 response the push service is telling us the subscription is
 * dead (uninstalled, permission revoked, endpoint rotated away) — that
 * row is deleted so it stops being retried.
 */
export async function sendPushNotification(
  sub: Pick<StoredPushSubscription, "endpoint" | "p256dh" | "auth">,
  payload: PushPayload,
): Promise<PushSendResult> {
  if (!isConfigured) {
    return { ok: false, error: "VAPID keys not configured.", gone: false };
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
    );
    return { ok: true };
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    const body = (err as { body?: string }).body;
    const gone = statusCode === 404 || statusCode === 410;
    if (gone) {
      await deletePushSubscriptionByEndpoint(sub.endpoint);
    }
    const message = err instanceof Error ? err.message : "Erro ao enviar notificação.";
    // The push service's rejection reason (e.g. bad VAPID key, expired
    // subscription) lands in statusCode/body, not in the generic message —
    // logged here since sendPushNotification's caller only sees ok/error counts.
    console.error("[push] sendNotification failed", { endpoint: sub.endpoint, statusCode, body, message });
    return { ok: false, error: message, statusCode, body, gone };
  }
}
