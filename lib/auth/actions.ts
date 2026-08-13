"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "./password";
import { createSession, setSessionCookie, deleteSessionByToken } from "./session";
import { SESSION_COOKIE_NAME } from "./cookies";

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Informe seu usuário ou e-mail."),
  password: z.string().min(1, "Informe sua senha."),
});

export type LoginFormState = {
  error?: string;
};

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Preencha usuário/e-mail e senha." };
  }

  const { identifier, password } = parsed.data;

  const rows = await db
    .select()
    .from(users)
    .where(or(eq(users.username, identifier), eq(users.email, identifier)))
    .limit(1);

  const user = rows[0];

  // Always compare against something to keep timing roughly constant
  // whether or not the user exists.
  const passwordHash = user?.passwordHash ?? DUMMY_HASH;
  const passwordOk = verifyPassword(password, passwordHash);

  if (!user || !passwordOk) {
    return { error: "Usuário ou senha inválidos." };
  }

  const { token, expiresAt } = await createSession(user.id);
  await setSessionCookie(token, expiresAt);

  redirect("/");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await deleteSessionByToken(token);
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}

// A syntactically valid but unusable hash, used to keep verifyPassword's
// cost roughly constant on the "user not found" path.
const DUMMY_HASH =
  "scrypt$16384$8$1$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
