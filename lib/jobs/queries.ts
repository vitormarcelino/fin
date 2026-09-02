import "server-only";

import { db } from "@/lib/db";
import { jobRuns } from "@/lib/db/schema";

/**
 * Claims a scheduled job's run for a given day. Returns true only for the
 * caller that first inserts the (jobName, ranOn) row — everyone else (e.g.
 * the scheduler's next poll tick within the same hour, or a fresh check
 * after a mid-run restart) gets false and should treat the job as already
 * done for that day.
 */
export async function claimJobRun(jobName: string, ranOn: string): Promise<boolean> {
  const rows = await db.insert(jobRuns).values({ jobName, ranOn }).onConflictDoNothing().returning();
  return rows.length > 0;
}
