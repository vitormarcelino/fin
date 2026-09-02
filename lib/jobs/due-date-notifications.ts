import "server-only";

import type { FinancialEntry } from "@/lib/db/schema";
import { getEntriesDueOn } from "@/lib/entries/queries";
import { claimJobRun } from "@/lib/jobs/queries";
import { listPushSubscriptions } from "@/lib/push/queries";
import { sendPushNotification, type PushPayload } from "@/lib/push/send";
import { formatCentsToBRL } from "@/lib/utils/money";

const JOB_NAME = "due-date-notifications";

function buildPayload(entry: FinancialEntry): PushPayload {
  const title = entry.type === "EXPENSE" ? "Vencimento hoje" : "A receber hoje";
  const valor = entry.amountCents == null ? "valor a confirmar" : formatCentsToBRL(entry.amountCents);
  return { title, body: `${entry.description} — ${valor}` };
}

/**
 * Sends one push notification per device for every PENDING entry due on
 * `today`. Idempotent per day via claimJobRun: the scheduler polls every
 * minute during the target hour, so a second call for the same `today`
 * (same tick's next minute, or after a mid-run restart) is a no-op.
 *
 * `send` is injectable (defaults to the real sendPushNotification) so tests
 * can verify the orchestration without hitting a real push service.
 */
export async function runDueDateNotifications(
  today: string,
  send: typeof sendPushNotification = sendPushNotification,
): Promise<{ ran: boolean; notified: number }> {
  const claimed = await claimJobRun(JOB_NAME, today);
  if (!claimed) return { ran: false, notified: 0 };

  const entries = await getEntriesDueOn(today);
  let notified = 0;
  for (const entry of entries) {
    const subs = await listPushSubscriptions(entry.userId);
    const payload = buildPayload(entry);
    for (const sub of subs) {
      const result = await send(sub, payload);
      if (result.ok) notified++;
    }
  }
  return { ran: true, notified };
}
