import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
  SESSION_RENEWAL_THRESHOLD_MS,
} from "./cookies";

export type SessionUser = {
  id: string;
  username: string;
  email: string;
};

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a session row in the database and returns the raw (unhashed)
 * token that should be stored in the client's cookie. Only the hash is
 * ever persisted.
 */
export async function createSession(
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });

  return { token, expiresAt };
}

/**
 * Sets the session cookie. Must be called from a Server Action or Route
 * Handler (Next.js disallows cookie mutation during Server Component
 * rendering).
 */
export async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Reads the session cookie, validates it against the database, and
 * returns the associated user. Memoized per-request so multiple calls
 * during a single render don't hit the database repeatedly.
 *
 * Never trust a client-supplied userId — this is the single source of
 * truth for "who is making this request".
 */
export const getSession = cache(async (): Promise<{
  user: SessionUser;
  expiresAt: Date;
} | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const tokenHash = hashToken(token);

  const rows = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      userId: users.id,
      username: users.username,
      email: users.email,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  if (row.expiresAt.getTime() <= Date.now()) {
    // Expired: best-effort cleanup, session is invalid regardless.
    await db.delete(sessions).where(eq(sessions.id, row.sessionId));
    return null;
  }

  // Sliding expiration: extend the database record when it's close to
  // expiring. The browser-side cookie lifetime is refreshed separately
  // by proxy.ts on every authenticated request.
  const remaining = row.expiresAt.getTime() - Date.now();
  let expiresAt = row.expiresAt;
  if (remaining < SESSION_RENEWAL_THRESHOLD_MS) {
    expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await db
      .update(sessions)
      .set({ expiresAt })
      .where(eq(sessions.id, row.sessionId));
  }

  return {
    user: { id: row.userId, username: row.username, email: row.email },
    expiresAt,
  };
});

/**
 * Requires an authenticated session; redirects to /login otherwise.
 * This is the primary guard used at the top of protected server-side
 * data-loading code (pages, layouts, Server Actions).
 */
export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function deleteSessionByToken(token: string) {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}
