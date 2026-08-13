import { afterAll } from "vitest";
import { dbClient } from "@/lib/db";

// Without this, the open Postgres socket keeps each Vitest worker process
// alive after its test file finishes, and `vitest run` hangs instead of
// exiting.
afterAll(async () => {
  await dbClient.end();
});
