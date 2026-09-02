import { db } from "@/lib/db";
import {
  entryTags,
  financialEntries,
  jobRuns,
  pushSubscriptions,
  recurringEntries,
  recurringEntryTags,
  sessions,
  tags,
  users,
} from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";

/**
 * Wipes all app tables. Order matters only for readability — every FK here
 * cascades from `users`, but being explicit keeps this correct even if that
 * ever changes. `job_runs` has no FK to `users` at all (it's a scheduler
 * claim table, not user data) but still needs wiping between tests.
 */
export async function truncateAll() {
  await db.execute(
    `TRUNCATE TABLE entry_tags, financial_entries, recurring_entry_tags, recurring_entries, push_subscriptions, job_runs, tags, sessions, users RESTART IDENTITY CASCADE`,
  );
}

let counter = 0;

/** Inserts a user directly (no CLI script involved) for tests to act as. */
export async function createTestUser(overrides: { username?: string; email?: string; password?: string } = {}) {
  counter += 1;
  const username = overrides.username ?? `testuser${counter}`;
  const email = overrides.email ?? `${username}@example.test`;
  const password = overrides.password ?? "correct horse battery staple";

  const [user] = await db
    .insert(users)
    .values({ username, email, passwordHash: hashPassword(password) })
    .returning();

  return { ...user, plaintextPassword: password };
}

export {
  db,
  users,
  sessions,
  financialEntries,
  tags,
  entryTags,
  recurringEntries,
  recurringEntryTags,
  pushSubscriptions,
  jobRuns,
};
