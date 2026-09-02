import { describe, expect, it } from "vitest";
import { pushSubscriptionSchema, pushUnsubscribeSchema } from "@/lib/push/schema";

describe("pushSubscriptionSchema", () => {
  it("accepts a well-formed browser PushSubscription", () => {
    const result = pushSubscriptionSchema.safeParse({
      endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
      keys: { p256dh: "key1", auth: "key2" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing endpoint", () => {
    const result = pushSubscriptionSchema.safeParse({
      keys: { p256dh: "key1", auth: "key2" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-URL endpoint", () => {
    const result = pushSubscriptionSchema.safeParse({
      endpoint: "not-a-url",
      keys: { p256dh: "key1", auth: "key2" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing keys", () => {
    const result = pushSubscriptionSchema.safeParse({
      endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
    });
    expect(result.success).toBe(false);
  });
});

describe("pushUnsubscribeSchema", () => {
  it("accepts just an endpoint", () => {
    const result = pushUnsubscribeSchema.safeParse({
      endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty payload", () => {
    expect(pushUnsubscribeSchema.safeParse({}).success).toBe(false);
  });
});
