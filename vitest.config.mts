import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // `server-only` throws unconditionally when required outside a
      // bundler that understands its "react-server" export condition
      // (which is how Next.js enforces the server/client boundary at
      // build time). Under plain Node/Vitest there is no such bundler, so
      // swap in a no-op — the import-time guard has nothing to test here;
      // what we're testing is the logic in the files that import it.
      "server-only": fileURLToPath(new URL("./tests/mocks/server-only.ts", import.meta.url)),
      // `cookies()` normally reads Next's per-request AsyncLocalStorage,
      // which only exists while `next dev`/`next start` is handling an
      // actual request. Swap in an in-memory jar so session.ts's cookie
      // read/write logic is exercised directly.
      "next/headers": fileURLToPath(new URL("./tests/mocks/next-headers.ts", import.meta.url)),
      // `revalidatePath` needs Next's per-request static-generation store,
      // which doesn't exist outside a live request/action. See the mock file
      // for why a no-op is safe here.
      "next/cache": fileURLToPath(new URL("./tests/mocks/next-cache.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    hookTimeout: 20_000,
    testTimeout: 20_000,
    // DB-backed tests share one Postgres connection pool (lib/db) and one
    // physical database (fin_test); running files in parallel workers would
    // race on TRUNCATE. Sequential keeps it simple and fast enough at this
    // test-suite size.
    fileParallelism: false,
  },
});
