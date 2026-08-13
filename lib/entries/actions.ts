"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { entryTags, financialEntries } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { entryFormDataToInput, entryFormSchema, quickEditEntrySchema } from "@/lib/entries/schema";
import { resolveTagIds } from "@/lib/tags/resolve";

export type EntryActionState = {
  error?: string;
};

export type QuickEditActionState = {
  error?: string;
  success?: boolean;
};

function revalidateEntryPaths() {
  revalidatePath("/");
  revalidatePath("/entries");
  revalidatePath("/tags");
}

export async function createEntry(
  _prevState: EntryActionState,
  formData: FormData,
): Promise<EntryActionState> {
  const session = await requireSession();
  const parsed = entryFormSchema.safeParse(entryFormDataToInput(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { tagIds, newTagNames, ...entry } = parsed.data;
  const userId = session.user.id;

  const finalTagIds = await resolveTagIds(userId, tagIds, newTagNames);

  const [created] = await db
    .insert(financialEntries)
    .values({ ...entry, userId, status: "PENDING" })
    .returning({ id: financialEntries.id });

  if (finalTagIds.length > 0) {
    await db
      .insert(entryTags)
      .values(finalTagIds.map((tagId) => ({ entryId: created.id, tagId })));
  }

  revalidateEntryPaths();
  redirect("/entries");
}

export async function updateEntry(
  id: string,
  _prevState: EntryActionState,
  formData: FormData,
): Promise<EntryActionState> {
  const session = await requireSession();
  const userId = session.user.id;

  const parsed = entryFormSchema.safeParse(entryFormDataToInput(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { tagIds, newTagNames, ...entry } = parsed.data;

  const finalTagIds = await resolveTagIds(userId, tagIds, newTagNames);

  const updated = await db
    .update(financialEntries)
    .set(entry)
    .where(and(eq(financialEntries.id, id), eq(financialEntries.userId, userId)))
    .returning({ id: financialEntries.id });

  if (updated.length === 0) {
    return { error: "Lançamento não encontrado." };
  }

  await db.delete(entryTags).where(eq(entryTags.entryId, id));
  if (finalTagIds.length > 0) {
    await db.insert(entryTags).values(finalTagIds.map((tagId) => ({ entryId: id, tagId })));
  }

  revalidateEntryPaths();
  redirect("/entries");
}

/** Quick-edit modal on the entry list: confirms/updates the amount and the
 *  payment status together in one save, without touching the other fields. */
export async function updateEntryValueAndStatus(
  id: string,
  _prevState: QuickEditActionState,
  formData: FormData,
): Promise<QuickEditActionState> {
  const session = await requireSession();

  const parsed = quickEditEntrySchema.safeParse({
    amountCents: formData.get("amount"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const updated = await db
    .update(financialEntries)
    .set({ amountCents: parsed.data.amountCents, status: parsed.data.status, updatedAt: new Date() })
    .where(and(eq(financialEntries.id, id), eq(financialEntries.userId, session.user.id)))
    .returning({ id: financialEntries.id });

  if (updated.length === 0) {
    return { error: "Lançamento não encontrado." };
  }

  revalidateEntryPaths();
  return { success: true };
}

/** Toggles the "Pendente"/"Pago" payment-status guide on its own — kept for
 *  the DB test suite; the entry list now uses updateEntryValueAndStatus. */
export async function toggleEntryStatus(id: string, status: "PENDING" | "PAID") {
  const session = await requireSession();
  await db
    .update(financialEntries)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(financialEntries.id, id), eq(financialEntries.userId, session.user.id)));

  revalidateEntryPaths();
}

export async function deleteEntry(id: string) {
  const session = await requireSession();
  // Ownership enforced in the WHERE clause — never trust a client-supplied id.
  // entry_tags rows for this entry cascade-delete.
  await db
    .delete(financialEntries)
    .where(and(eq(financialEntries.id, id), eq(financialEntries.userId, session.user.id)));

  revalidateEntryPaths();
  redirect("/entries");
}
