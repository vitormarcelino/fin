CREATE TABLE "recurring_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "entry_type" NOT NULL,
	"description" text NOT NULL,
	"amount_cents" integer,
	"due_day" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_recurring_amount_positive" CHECK ("recurring_entries"."amount_cents" IS NULL OR ("recurring_entries"."amount_cents" > 0 AND "recurring_entries"."amount_cents" <= 999999999)),
	CONSTRAINT "chk_recurring_due_day" CHECK ("recurring_entries"."due_day" BETWEEN 1 AND 31)
);
--> statement-breakpoint
CREATE TABLE "recurring_entry_tags" (
	"recurring_entry_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "recurring_entry_tags_recurring_entry_id_tag_id_pk" PRIMARY KEY("recurring_entry_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "financial_entries" DROP CONSTRAINT "chk_amount_positive";--> statement-breakpoint
ALTER TABLE "financial_entries" ALTER COLUMN "amount_cents" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_entries" ADD COLUMN "due_date" date;--> statement-breakpoint
ALTER TABLE "financial_entries" ADD COLUMN "recurring_entry_id" uuid;--> statement-breakpoint
ALTER TABLE "recurring_entries" ADD CONSTRAINT "recurring_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_entry_tags" ADD CONSTRAINT "recurring_entry_tags_recurring_entry_id_recurring_entries_id_fk" FOREIGN KEY ("recurring_entry_id") REFERENCES "public"."recurring_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_entry_tags" ADD CONSTRAINT "recurring_entry_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_recurring_entries_user" ON "recurring_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_recurring_entry_tags_tag_id" ON "recurring_entry_tags" USING btree ("tag_id");--> statement-breakpoint
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_recurring_entry_id_recurring_entries_id_fk" FOREIGN KEY ("recurring_entry_id") REFERENCES "public"."recurring_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_entries_recurring_entry_id" ON "financial_entries" USING btree ("recurring_entry_id");--> statement-breakpoint
ALTER TABLE "financial_entries" ADD CONSTRAINT "chk_amount_positive" CHECK ("financial_entries"."amount_cents" IS NULL OR ("financial_entries"."amount_cents" > 0 AND "financial_entries"."amount_cents" <= 999999999));