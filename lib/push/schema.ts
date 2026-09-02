import { z } from "zod";

/** Shape of the PushSubscription object serialized by the browser
 *  (`JSON.parse(JSON.stringify(subscription))`), as POSTed to /api/push/subscribe. */
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url(),
});
