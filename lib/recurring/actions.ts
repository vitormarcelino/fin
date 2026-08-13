"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { recurringEntries, recurringEntryTags } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import {
  recurringEntryFormDataToInput,
  recurringEntryFormSchema,
} from "@/lib/recurring/schema";
import { resolveTagIds } from "@/lib/tags/resolve";

export type RecurringEntryActionState = {
  error?: string;
};

function revalidateRecurringPaths() {
  revalidatePath("/");
  revalidatePath("/entries");
  revalidatePath("/recurring");
}

export async function createRecurringEntry(
  _prevState: RecurringEntryActionState,
  formData: FormData,
): Promise<RecurringEntryActionState> {
  const session = await requireSession();
  const parsed = recurringEntryFormSchema.safeParse(recurringEntryFormDataToInput(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { tagIds, newTagNames, hasFixedAmount, amountCents, ...rest } = parsed.data;
  const userId = session.user.id;

  const finalTagIds = await resolveTagIds(userId, tagIds, newTagNames);

  const [created] = await db
    .insert(recurringEntries)
    .values({ ...rest, amountCents: hasFixedAmount ? amountCents : null, userId })
    .returning({ id: recurringEntries.id });

  if (finalTagIds.length > 0) {
    await db
      .insert(recurringEntryTags)
      .values(finalTagIds.map((tagId) => ({ recurringEntryId: created.id, tagId })));
  }

  revalidateRecurringPaths();
  redirect("/recurring");
}

export async function updateRecurringEntry(
  id: string,
  _prevState: RecurringEntryActionState,
  formData: FormData,
): Promise<RecurringEntryActionState> {
  const session = await requireSession();
  const userId = session.user.id;

  const parsed = recurringEntryFormSchema.safeParse(recurringEntryFormDataToInput(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { tagIds, newTagNames, hasFixedAmount, amountCents, ...rest } = parsed.data;

  const finalTagIds = await resolveTagIds(userId, tagIds, newTagNames);

  const updated = await db
    .update(recurringEntries)
    .set({ ...rest, amountCents: hasFixedAmount ? amountCents : null })
    .where(and(eq(recurringEntries.id, id), eq(recurringEntries.userId, userId)))
    .returning({ id: recurringEntries.id });

  if (updated.length === 0) {
    return { error: "Lançamento fixo não encontrado." };
  }

  await db.delete(recurringEntryTags).where(eq(recurringEntryTags.recurringEntryId, id));
  if (finalTagIds.length > 0) {
    await db
      .insert(recurringEntryTags)
      .values(finalTagIds.map((tagId) => ({ recurringEntryId: id, tagId })));
  }

  revalidateRecurringPaths();
  redirect("/recurring");
}

/** Pauses or resumes a recurring template. Pausing never touches instances
 *  already generated in `financial_entries` — it only stops future ones. */
export async function toggleRecurringEntryActive(id: string, active: boolean) {
  const session = await requireSession();
  await db
    .update(recurringEntries)
    .set({ active, updatedAt: new Date() })
    .where(and(eq(recurringEntries.id, id), eq(recurringEntries.userId, session.user.id)));

  revalidateRecurringPaths();
}

export async function deleteRecurringEntry(id: string) {
  const session = await requireSession();
  // Ownership enforced in the WHERE clause. financial_entries generated from
  // this template keep their history — recurringEntryId is set to null
  // rather than cascading (see schema.ts).
  await db
    .delete(recurringEntries)
    .where(and(eq(recurringEntries.id, id), eq(recurringEntries.userId, session.user.id)));

  revalidateRecurringPaths();
  redirect("/recurring");
}
