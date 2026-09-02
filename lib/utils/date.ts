/**
 * Month arithmetic on "YYYY-MM" strings, done with plain integer math
 * (no Date object timezone shifting) to keep month boundaries exact.
 */

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Whether "YYYY-MM-DD" is both well-formed and a real calendar date (rejects e.g. 2026-02-30). */
export function isValidCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return (
    date.getUTCFullYear() === Number(y) &&
    date.getUTCMonth() === Number(m) - 1 &&
    date.getUTCDate() === Number(d)
  );
}

export function isValidMonthString(value: string): boolean {
  return MONTH_RE.test(value);
}

export function currentMonthString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(month: string): { year: number; month: number } {
  const [y, m] = month.split("-").map(Number);
  return { year: y, month: m };
}

/** Adds `delta` months to a "YYYY-MM" string (delta may be negative). */
export function addMonths(month: string, delta: number): string {
  const { year, month: m } = parseMonth(month);
  const total = year * 12 + (m - 1) + delta;
  const newYear = Math.floor(total / 12);
  const newMonth = (total % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, "0")}`;
}

/** Inclusive [start, end) date bounds (YYYY-MM-DD) for a given month. */
export function monthDateRange(month: string): { start: string; end: string } {
  const { year, month: m } = parseMonth(month);
  const start = `${year}-${String(m).padStart(2, "0")}-01`;
  const nextMonth = addMonths(month, 1);
  const { year: ny, month: nm } = parseMonth(nextMonth);
  const end = `${ny}-${String(nm).padStart(2, "0")}-01`;
  return { start, end };
}

/** "2026-08" -> "Agosto de 2026" (pt-BR). */
export function formatMonthLabel(month: string): string {
  const { year, month: m } = parseMonth(month);
  const date = new Date(Date.UTC(year, m - 1, 1));
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "2026-08" -> "ago" (short, pt-BR, used for compact chart axis ticks). */
export function formatMonthShortLabel(month: string): string {
  const { year, month: m } = parseMonth(month);
  const date = new Date(Date.UTC(year, m - 1, 1));
  return new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" })
    .format(date)
    .replace(".", "");
}

/** "2026-08-05" -> "05/08/2026" (pt-BR). */
export function formatDateLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(date);
}

/**
 * Builds "YYYY-MM-DD" for `day` within `month`, clamped to that month's
 * actual last day (e.g. day 31 in February becomes the 28th/29th). Used to
 * turn a recurring template's fixed `dueDay` into a concrete date for the
 * month being generated.
 */
export function clampDayToMonth(month: string, day: number): string {
  const { year, month: m } = parseMonth(month);
  const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const clamped = Math.min(day, lastDay);
  return `${year}-${String(m).padStart(2, "0")}-${String(clamped).padStart(2, "0")}`;
}

/** Today as "YYYY-MM-DD" in the local timezone (used as a form default). */
export function todayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Today as "YYYY-MM-DD" in an explicit IANA timezone — independent of the
 *  host/container's local timezone (the Docker image has none configured
 *  and defaults to UTC). Used by the due-date notification scheduler so
 *  "today" and "9am" are evaluated in Brazil time regardless of where the
 *  server runs. */
export function todayInTimeZone(timeZone: string): string {
  // en-CA formats as "YYYY-MM-DD" directly.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Adds `delta` days to a "YYYY-MM-DD" string (delta may be negative). Uses UTC internally so day-of-month rollovers land correctly regardless of the host's local timezone. */
export function addDays(isoDate: string, delta: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + delta));
  const ny = date.getUTCFullYear();
  const nm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const nd = String(date.getUTCDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}
