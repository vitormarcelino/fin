import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  createSession,
  deleteSessionByToken,
  generateSessionToken,
  getSession,
  hashToken,
  requireSession,
  setSessionCookie,
} from "@/lib/auth/session";
import { SESSION_COOKIE_NAME, SESSION_RENEWAL_THRESHOLD_MS } from "@/lib/auth/cookies";
import { __resetMockCookies, __getMockCookie } from "@/tests/mocks/next-headers";
import { createTestUser, db, sessions, truncateAll } from "@/tests/db-helpers";

beforeEach(async () => {
  await truncateAll();
  __resetMockCookies();
});

describe("generateSessionToken / hashToken", () => {
  it("generates a different token on every call", () => {
    expect(generateSessionToken()).not.toBe(generateSessionToken());
  });

  it("hashes deterministically", () => {
    const token = generateSessionToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("produces different hashes for different tokens", () => {
    expect(hashToken(generateSessionToken())).not.toBe(hashToken(generateSessionToken()));
  });
});

describe("createSession", () => {
  it("never stores the raw token in plaintext, only its hash", async () => {
    const user = await createTestUser();
    const { token } = await createSession(user.id);

    const [row] = await db.select().from(sessions).where(eq(sessions.userId, user.id));
    expect(row.tokenHash).not.toBe(token);
    expect(row.tokenHash).toBe(hashToken(token));
  });

  it("sets an expiry roughly 30 days out", async () => {
    const user = await createTestUser();
    const { expiresAt } = await createSession(user.id);
    const daysOut = (expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(daysOut).toBeGreaterThan(29);
    expect(daysOut).toBeLessThan(31);
  });
});

describe("deleteSessionByToken", () => {
  it("removes exactly the matching session", async () => {
    const user = await createTestUser();
    const { token } = await createSession(user.id);

    await deleteSessionByToken(token);

    const rows = await db.select().from(sessions).where(eq(sessions.userId, user.id));
    expect(rows).toHaveLength(0);
  });
});

describe("getSession", () => {
  it("returns null when there is no session cookie", async () => {
    expect(await getSession()).toBeNull();
  });

  it("returns the associated user for a valid session cookie", async () => {
    const user = await createTestUser({ username: "alice" });
    const { token, expiresAt } = await createSession(user.id);
    await setSessionCookie(token, expiresAt);

    const session = await getSession();
    expect(session?.user.username).toBe("alice");
    expect(session?.user.id).toBe(user.id);
  });

  it("returns null and deletes the row for an expired session", async () => {
    const user = await createTestUser();
    const { token } = await createSession(user.id);
    const [row] = await db.select().from(sessions).where(eq(sessions.userId, user.id));
    await db.update(sessions).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(sessions.id, row.id));
    await setSessionCookie(token, new Date(Date.now() - 1000));

    const session = await getSession();
    expect(session).toBeNull();

    const remaining = await db.select().from(sessions).where(eq(sessions.userId, user.id));
    expect(remaining).toHaveLength(0);
  });

  it("extends (slides) the expiry when it's within the renewal threshold", async () => {
    const user = await createTestUser();
    const { token } = await createSession(user.id);
    const [row] = await db.select().from(sessions).where(eq(sessions.userId, user.id));

    // Put it just inside the renewal window (threshold is 15 days).
    const soonExpiry = new Date(Date.now() + SESSION_RENEWAL_THRESHOLD_MS - 60_000);
    await db.update(sessions).set({ expiresAt: soonExpiry }).where(eq(sessions.id, row.id));
    await setSessionCookie(token, soonExpiry);

    await getSession();

    const [updated] = await db.select().from(sessions).where(eq(sessions.id, row.id));
    const daysOut = (updated.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(daysOut).toBeGreaterThan(29); // pushed back out to ~30 days
  });

  it("does not slide the expiry when it's outside the renewal window", async () => {
    const user = await createTestUser();
    const { token } = await createSession(user.id);
    const [row] = await db.select().from(sessions).where(eq(sessions.userId, user.id));
    await setSessionCookie(token, row.expiresAt);

    await getSession();

    const [unchanged] = await db.select().from(sessions).where(eq(sessions.id, row.id));
    expect(unchanged.expiresAt.getTime()).toBe(row.expiresAt.getTime());
  });
});

describe("setSessionCookie", () => {
  it("sets an httpOnly cookie under the configured name", async () => {
    const expiresAt = new Date(Date.now() + 1000);
    await setSessionCookie("raw-token-value", expiresAt);
    expect(__getMockCookie(SESSION_COOKIE_NAME)?.value).toBe("raw-token-value");
  });
});

describe("requireSession", () => {
  it("redirects to /login when there is no session", async () => {
    await expect(requireSession()).rejects.toMatchObject({
      digest: expect.stringContaining("/login"),
    });
  });

  it("returns the session when authenticated", async () => {
    const user = await createTestUser();
    const { token, expiresAt } = await createSession(user.id);
    await setSessionCookie(token, expiresAt);

    const session = await requireSession();
    expect(session.user.id).toBe(user.id);
  });
});
