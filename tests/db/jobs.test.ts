import { beforeEach, describe, expect, it } from "vitest";
import { claimJobRun } from "@/lib/jobs/queries";
import { truncateAll } from "@/tests/db-helpers";

beforeEach(async () => {
  await truncateAll();
});

describe("claimJobRun", () => {
  it("returns true for the first claim of a (job, day) pair", async () => {
    expect(await claimJobRun("due-date-notifications", "2026-08-05")).toBe(true);
  });

  it("returns false for a second claim of the same (job, day) pair", async () => {
    await claimJobRun("due-date-notifications", "2026-08-05");
    expect(await claimJobRun("due-date-notifications", "2026-08-05")).toBe(false);
  });

  it("claims different days independently", async () => {
    await claimJobRun("due-date-notifications", "2026-08-05");
    expect(await claimJobRun("due-date-notifications", "2026-08-06")).toBe(true);
  });

  it("claims different job names independently for the same day", async () => {
    await claimJobRun("due-date-notifications", "2026-08-05");
    expect(await claimJobRun("some-other-job", "2026-08-05")).toBe(true);
  });
});
