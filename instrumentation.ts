// Runs once when the Next.js server process starts (see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md).
// Used here to start an in-process scheduler for the daily due-date
// notification job — this app is a persistent Docker/Node process
// (`output: "standalone"`, `node server.js`), not serverless, so there's
// always exactly one long-running instance to host this timer.
const NOTIFICATION_TIMEZONE = "America/Sao_Paulo";
const NOTIFICATION_HOUR = 9;
const POLL_INTERVAL_MS = 60_000;

export function register() {
  // Guard against the edge runtime: this app has no middleware/edge routes
  // today, but this mirrors the Next.js docs' own recommended pattern and
  // keeps `pg`/`web-push` out of any future edge bundle.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  setInterval(async () => {
    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: NOTIFICATION_TIMEZONE,
        hour: "2-digit",
        hour12: false,
      }).format(new Date()),
    );
    if (hour !== NOTIFICATION_HOUR) return;

    try {
      const { todayInTimeZone } = await import("@/lib/utils/date");
      const { runDueDateNotifications } = await import("@/lib/jobs/due-date-notifications");
      const result = await runDueDateNotifications(todayInTimeZone(NOTIFICATION_TIMEZONE));
      if (result.ran) {
        console.log("[jobs] due-date-notifications sent", result.notified, "notifications");
      }
    } catch (err) {
      console.error("[jobs] due-date-notifications failed", err);
    }
  }, POLL_INTERVAL_MS);
}
