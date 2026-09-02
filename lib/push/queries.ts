import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import type { PushSubscriptionInput } from "@/lib/push/schema";

/** All devices/browsers this user has subscribed for push notifications. */
export async function listPushSubscriptions(userId: string) {
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
}

/** Records a subscription, or refreshes its keys if the same endpoint
 *  (device/browser install) subscribes again — e.g. after the browser
 *  rotates the underlying push service keys. */
export async function upsertPushSubscription(userId: string, sub: PushSubscriptionInput) {
  await db
    .insert(pushSubscriptions)
    .values({
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
}

/** Removes a subscription. Scoped to the calling user so one account can
 *  never drop another's subscription by guessing/reusing an endpoint. */
export async function deletePushSubscription(userId: string, endpoint: string) {
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
}

/** Drops a subscription by endpoint alone — used to clean up entries the
 *  push service itself has reported as gone (410/404), where we only
 *  have the endpoint on hand, not the owning user. */
export async function deletePushSubscriptionByEndpoint(endpoint: string) {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}
