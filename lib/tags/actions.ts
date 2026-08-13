"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { tags } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { isUniqueViolation } from "@/lib/db/errors";

const tagNameSchema = z
  .string()
  .trim()
  .min(1, "Informe um nome para a tag.")
  .max(40, "O nome da tag deve ter no máximo 40 caracteres.");

export type TagActionState = {
  error?: string;
};

export async function createTag(
  _prevState: TagActionState,
  formData: FormData,
): Promise<TagActionState> {
  const session = await requireSession();
  const parsed = tagNameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nome inválido." };
  }

  try {
    await db.insert(tags).values({ userId: session.user.id, name: parsed.data });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: "Você já tem uma tag com esse nome." };
    }
    throw err;
  }

  revalidatePath("/tags");
  revalidatePath("/entries");
  revalidatePath("/entries/new");
  return {};
}

export async function renameTag(
  id: string,
  _prevState: TagActionState,
  formData: FormData,
): Promise<TagActionState> {
  const session = await requireSession();
  const parsed = tagNameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nome inválido." };
  }

  try {
    const result = await db
      .update(tags)
      .set({ name: parsed.data })
      .where(and(eq(tags.id, id), eq(tags.userId, session.user.id)))
      .returning({ id: tags.id });

    if (result.length === 0) {
      return { error: "Tag não encontrada." };
    }
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: "Você já tem uma tag com esse nome." };
    }
    throw err;
  }

  revalidatePath("/tags");
  revalidatePath("/entries");
  return {};
}

export async function deleteTag(id: string) {
  const session = await requireSession();
  // Ownership enforced in the WHERE clause — never trust a client-supplied id
  // alone. entry_tags rows for this tag cascade-delete; entries themselves
  // are untouched.
  await db
    .delete(tags)
    .where(and(eq(tags.id, id), eq(tags.userId, session.user.id)));

  revalidatePath("/tags");
  revalidatePath("/entries");
}
