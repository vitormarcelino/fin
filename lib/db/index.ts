import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  var __finDbClient: ReturnType<typeof postgres> | undefined;
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Reuse the connection across hot reloads in dev to avoid exhausting
// Postgres connections.
const client =
  globalThis.__finDbClient ?? postgres(process.env.DATABASE_URL, { max: 10 });

if (process.env.NODE_ENV !== "production") {
  globalThis.__finDbClient = client;
}

export const db = drizzle(client, { schema });

// Exposed so tests can close the connection pool in an afterAll — without
// this, an open Postgres socket keeps a Vitest worker process alive after
// the suite finishes.
export { client as dbClient };
