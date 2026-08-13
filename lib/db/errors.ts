import "server-only";

/**
 * Postgres unique-constraint violations (code 23505) surface here wrapped by
 * Drizzle's query error, with the actual `pg`/`postgres` error nested under
 * `.cause` — so the code must be checked at both levels.
 */
export function isUniqueViolation(err: unknown): boolean {
  return hasCode(err, "23505") || hasCode(getCause(err), "23505");
}

function hasCode(err: unknown, code: string): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === code
  );
}

function getCause(err: unknown): unknown {
  if (typeof err === "object" && err !== null && "cause" in err) {
    return (err as { cause?: unknown }).cause;
  }
  return undefined;
}
