import { beforeEach, describe, expect, it } from "vitest";
import {
  deletePushSubscription,
  deletePushSubscriptionByEndpoint,
  listPushSubscriptions,
  upsertPushSubscription,
} from "@/lib/push/queries";
import { createTestUser, truncateAll } from "@/tests/db-helpers";

beforeEach(async () => {
  await truncateAll();
});

const sampleSub = {
  endpoint: "https://push.example.com/abc123",
  keys: { p256dh: "p256dh-key", auth: "auth-key" },
};

describe("upsertPushSubscription / listPushSubscriptions", () => {
  it("stores a new subscription for the user", async () => {
    const user = await createTestUser();
    await upsertPushSubscription(user.id, sampleSub);

    const rows = await listPushSubscriptions(user.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      endpoint: sampleSub.endpoint,
      p256dh: "p256dh-key",
      auth: "auth-key",
    });
  });

  it("refreshes keys in place when the same endpoint subscribes again", async () => {
    const user = await createTestUser();
    await upsertPushSubscription(user.id, sampleSub);
    await upsertPushSubscription(user.id, {
      ...sampleSub,
      keys: { p256dh: "new-p256dh", auth: "new-auth" },
    });

    const rows = await listPushSubscriptions(user.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ p256dh: "new-p256dh", auth: "new-auth" });
  });

  it("only returns subscriptions belonging to the given user", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    await upsertPushSubscription(userA.id, sampleSub);

    expect(await listPushSubscriptions(userB.id)).toHaveLength(0);
    expect(await listPushSubscriptions(userA.id)).toHaveLength(1);
  });
});

describe("deletePushSubscription", () => {
  it("removes a subscription scoped to its owner", async () => {
    const user = await createTestUser();
    await upsertPushSubscription(user.id, sampleSub);

    await deletePushSubscription(user.id, sampleSub.endpoint);

    expect(await listPushSubscriptions(user.id)).toHaveLength(0);
  });

  it("does not delete another user's subscription for the same endpoint", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    await upsertPushSubscription(userA.id, sampleSub);

    await deletePushSubscription(userB.id, sampleSub.endpoint);

    expect(await listPushSubscriptions(userA.id)).toHaveLength(1);
  });
});

describe("deletePushSubscriptionByEndpoint", () => {
  it("removes the subscription regardless of owner", async () => {
    const user = await createTestUser();
    await upsertPushSubscription(user.id, sampleSub);

    await deletePushSubscriptionByEndpoint(sampleSub.endpoint);

    expect(await listPushSubscriptions(user.id)).toHaveLength(0);
  });
});
