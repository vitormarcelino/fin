// Vitest alias target for "next/headers" (see vitest.config.mts). The real
// `cookies()` reads a per-request AsyncLocalStorage that only exists while
// Next.js is handling an actual request. This in-memory stand-in lets
// lib/auth/session.ts's cookie read/write logic run directly under Vitest.

type StoredCookie = { value: string; expires?: Date };

const store = new Map<string, StoredCookie>();

/** Test-only helper: clear all cookies between tests. */
export function __resetMockCookies() {
  store.clear();
}

/** Test-only helper: read a cookie's raw value without going through the app. */
export function __getMockCookie(name: string): StoredCookie | undefined {
  return store.get(name);
}

export async function cookies() {
  return {
    get(name: string) {
      const found = store.get(name);
      return found ? { name, value: found.value } : undefined;
    },
    set(name: string, value: string, options?: { expires?: Date }) {
      store.set(name, { value, expires: options?.expires });
    },
    delete(name: string) {
      store.delete(name);
    },
  };
}
