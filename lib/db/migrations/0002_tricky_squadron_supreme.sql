CREATE TYPE "public"."entry_status" AS ENUM('PENDING', 'PAID');--> statement-breakpoint
ALTER TABLE "financial_entries" ADD COLUMN "status" "entry_status" DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
-- Backfill: entries that already existed before this migration are treated
-- as settled history. Everything inserted from here on (manual or
-- recurring-generated) is created with status = 'PENDING' explicitly by the
-- app, regardless of this column's default.
UPDATE "financial_entries" SET "status" = 'PAID';