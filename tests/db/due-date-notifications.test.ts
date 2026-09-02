import { beforeEach, describe, expect, it, vi } from "vitest";
import { runDueDateNotifications } from "@/lib/jobs/due-date-notifications";
import { upsertPushSubscription } from "@/lib/push/queries";
import { createTestUser, db, financialEntries, truncateAll } from "@/tests/db-helpers";

beforeEach(async () => {
  await truncateAll();
});

const TODAY = "2026-08-05";
const YESTERDAY = "2026-08-04";

async function insertEntry(overrides: Partial<typeof financialEntries.$inferInsert>) {
  await db.insert(financialEntries).values({
    userId: overrides.userId!,
    type: "EXPENSE",
    classification: "VARIABLE",
    description: "Conta de luz",
    amountCents: 5000,
    date: TODAY,
    dueDate: TODAY,
    status: "PENDING",
    ...overrides,
  });
}

async function subscribe(userId: string, endpoint: string) {
  await upsertPushSubscription(userId, {
    endpoint,
    keys: { p256dh: "p256dh-key", auth: "auth-key" },
  });
}

describe("runDueDateNotifications", () => {
  it("notifies every subscribed device for an entry due today", async () => {
    const user = await createTestUser();
    await insertEntry({ userId: user.id });
    await subscribe(user.id, "https://push.example.com/device-1");
    await subscribe(user.id, "https://push.example.com/device-2");

    const send = vi.fn().mockResolvedValue({ ok: true });
    const result = await runDueDateNotifications(TODAY, send);

    expect(result).toEqual({ ran: true, notified: 2 });
    expect(send).toHaveBeenCalledTimes(2);
    const [, payload] = send.mock.calls[0];
    expect(payload).toEqual({ title: "Vencimento hoje", body: "Conta de luz — R$ 50,00" });
  });

  it("uses an income-flavored title and 'valor a confirmar' for an unconfirmed amount", async () => {
    const user = await createTestUser();
    await insertEntry({ userId: user.id, type: "INCOME", amountCents: null });
    await subscribe(user.id, "https://push.example.com/device-1");

    const send = vi.fn().mockResolvedValue({ ok: true });
    await runDueDateNotifications(TODAY, send);

    const [, payload] = send.mock.calls[0];
    expect(payload).toEqual({ title: "A receber hoje", body: "Conta de luz — valor a confirmar" });
  });

  it("ignores entries due on a different day", async () => {
    const user = await createTestUser();
    await insertEntry({ userId: user.id, date: YESTERDAY, dueDate: YESTERDAY });
    await subscribe(user.id, "https://push.example.com/device-1");

    const send = vi.fn().mockResolvedValue({ ok: true });
    const result = await runDueDateNotifications(TODAY, send);

    expect(result).toEqual({ ran: true, notified: 0 });
    expect(send).not.toHaveBeenCalled();
  });

  it("ignores entries already marked PAID", async () => {
    const user = await createTestUser();
    await insertEntry({ userId: user.id, status: "PAID" });
    await subscribe(user.id, "https://push.example.com/device-1");

    const send = vi.fn().mockResolvedValue({ ok: true });
    const result = await runDueDateNotifications(TODAY, send);

    expect(result).toEqual({ ran: true, notified: 0 });
    expect(send).not.toHaveBeenCalled();
  });

  it("skips a user with no push subscriptions without erroring", async () => {
    const user = await createTestUser();
    await insertEntry({ userId: user.id });

    const send = vi.fn().mockResolvedValue({ ok: true });
    const result = await runDueDateNotifications(TODAY, send);

    expect(result).toEqual({ ran: true, notified: 0 });
    expect(send).not.toHaveBeenCalled();
  });

  it("is a no-op the second time it's called for the same day", async () => {
    const user = await createTestUser();
    await insertEntry({ userId: user.id });
    await subscribe(user.id, "https://push.example.com/device-1");

    const send = vi.fn().mockResolvedValue({ ok: true });
    await runDueDateNotifications(TODAY, send);
    const second = await runDueDateNotifications(TODAY, send);

    expect(second).toEqual({ ran: false, notified: 0 });
    expect(send).toHaveBeenCalledTimes(1);
  });
});
