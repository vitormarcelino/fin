import "server-only";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { listPushSubscriptions } from "@/lib/push/queries";
import { sendPushNotification } from "@/lib/push/send";

/**
 * Validation-only endpoint: fires one push notification at every device the
 * signed-in user has subscribed, so a notification arriving on an iOS
 * home-screen PWA can be confirmed end-to-end (VAPID keys, service worker,
 * iOS permission) without wiring it to any real app event yet.
 */
export async function POST() {
  const session = await requireSession();

  const subs = await listPushSubscriptions(session.user.id);
  if (subs.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma inscrição de notificação encontrada para este usuário." },
      { status: 404 },
    );
  }

  const results = await Promise.all(
    subs.map((sub) =>
      sendPushNotification(sub, {
        title: "Fin",
        body: "Notificação de teste — se você está vendo isso, funcionou! 🎉",
      }),
    ),
  );

  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;
  // This route only exists for manual validation, so it's fine to surface
  // the raw failure reason (VAPID mismatch, expired subscription, etc.)
  // straight from web-push — statusCode/body, not just the generic
  // "Received unexpected response code" message — instead of hiding it
  // behind a generic message the way a real user-facing feature would.
  const errors = results
    .filter((r): r is Extract<typeof r, { ok: false }> => !r.ok)
    .map((r) => (r.statusCode ? `${r.error} [${r.statusCode}] ${r.body ?? ""}`.trim() : r.error));

  return NextResponse.json({ sent, failed, errors });
}
