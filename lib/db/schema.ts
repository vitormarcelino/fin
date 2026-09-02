import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  date,
  pgEnum,
  uniqueIndex,
  index,
  primaryKey,
  check,
  boolean,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const entryTypeEnum = pgEnum("entry_type", ["INCOME", "EXPENSE"]);
export const entryClassificationEnum = pgEnum("entry_classification", [
  "FIXED",
  "VARIABLE",
]);
// Payment/settlement status — independent of amount confirmation. Every
// entry (manual or generated) is born "PENDING"; the app explicitly sets
// that on insert rather than relying only on the column default below.
export const entryStatusEnum = pgEnum("entry_status", ["PENDING", "PAID"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_sessions_user_id").on(table.userId),
    index("idx_sessions_expires_at").on(table.expiresAt),
  ],
);

export const recurringEntries = pgTable(
  "recurring_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: entryTypeEnum("type").notNull(),
    description: text("description").notNull(),
    // null = valor variável: cada instância gerada nasce com amountCents
    // null, pendente de confirmação pelo usuário.
    amountCents: integer("amount_cents"),
    dueDay: integer("due_day").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_recurring_entries_user").on(table.userId),
    check(
      "chk_recurring_amount_positive",
      sql`${table.amountCents} IS NULL OR (${table.amountCents} > 0 AND ${table.amountCents} <= 999999999)`,
    ),
    check(
      "chk_recurring_due_day",
      sql`${table.dueDay} BETWEEN 1 AND 31`,
    ),
  ],
);

export const financialEntries = pgTable(
  "financial_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: entryTypeEnum("type").notNull(),
    classification: entryClassificationEnum("classification").notNull(),
    description: text("description").notNull(),
    // Nullable: a "valor variável" instance generated from a recurring
    // template starts with no amount until the user confirms it by editing
    // the entry. Postgres SUM() ignores NULL, so dashboard totals exclude
    // unconfirmed entries automatically.
    amountCents: integer("amount_cents"),
    date: date("date", { mode: "string" }).notNull(),
    // Payment due date, meaningful for EXPENSE entries. Independent of
    // recurrence — any expense (manual or generated) may carry one.
    dueDate: date("due_date", { mode: "string" }),
    notes: text("notes"),
    // Set when this entry was auto-generated from a recurring template.
    // ON DELETE SET NULL: deleting the template must never delete already
    // generated history.
    recurringEntryId: uuid("recurring_entry_id").references(
      () => recurringEntries.id,
      { onDelete: "set null" },
    ),
    // "Pendente"/"Pago" — a payment-operations guide, separate from whether
    // the amount itself is confirmed (see amountCents above).
    status: entryStatusEnum("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_entries_user_date").on(table.userId, table.date),
    index("idx_entries_user_type").on(table.userId, table.type),
    index("idx_entries_recurring_entry_id").on(table.recurringEntryId),
    check(
      "chk_amount_nonnegative",
      sql`${table.amountCents} IS NULL OR (${table.amountCents} >= 0 AND ${table.amountCents} <= 999999999)`,
    ),
  ],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_tags_user_name_ci").on(
      table.userId,
      sql`lower(${table.name})`,
    ),
  ],
);

export const entryTags = pgTable(
  "entry_tags",
  {
    entryId: uuid("entry_id")
      .notNull()
      .references(() => financialEntries.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.entryId, table.tagId] }),
    index("idx_entry_tags_tag_id").on(table.tagId),
  ],
);

export const recurringEntryTags = pgTable(
  "recurring_entry_tags",
  {
    recurringEntryId: uuid("recurring_entry_id")
      .notNull()
      .references(() => recurringEntries.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.recurringEntryId, table.tagId] }),
    index("idx_recurring_entry_tags_tag_id").on(table.tagId),
  ],
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // The Push API endpoint URL issued by the browser's push service — the
    // real identity of a subscribed device/browser install. Globally
    // unique (not per-user): re-subscribing the same device just updates
    // its keys in place instead of creating a duplicate row.
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_push_subscriptions_user").on(table.userId)],
);

// One row per (job, day) it has run — a claim table for scheduled jobs.
// Inserting is how a job proves it's the first tick to handle that day;
// ON CONFLICT DO NOTHING makes re-checking within the same day a no-op,
// which matters because the scheduler polls every minute and the process
// can restart mid-run (e.g. during a deploy).
export const jobRuns = pgTable(
  "job_runs",
  {
    jobName: text("job_name").notNull(),
    ranOn: date("ran_on", { mode: "string" }).notNull(),
    ranAt: timestamp("ran_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.jobName, table.ranOn] })],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type FinancialEntry = typeof financialEntries.$inferSelect;
export type NewFinancialEntry = typeof financialEntries.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type EntryTag = typeof entryTags.$inferSelect;
export type RecurringEntry = typeof recurringEntries.$inferSelect;
export type NewRecurringEntry = typeof recurringEntries.$inferInsert;
export type RecurringEntryTag = typeof recurringEntryTags.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;
export type JobRun = typeof jobRuns.$inferSelect;
