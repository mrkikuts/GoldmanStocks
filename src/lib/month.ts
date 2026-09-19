import { z } from "zod/v4";

import { COMPANY_TZ } from "./weather";

/**
 * Calendar-month helpers, shared by the report's server code and its route.
 *
 * This lives outside `src/lib/server/` on purpose: the route needs `currentMonth`, `monthShift`
 * and `MonthParam` to validate its search param, and anything under `server/` is denied in the
 * browser (see docs/HANDOFF.md, "Conventions to keep").
 */

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** "YYYY-MM" for now, on the company's clock — not UTC's, and not the browser's. */
export function currentMonth(now = new Date(), timeZone = COMPANY_TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).format(now);
}

/**
 * A search param that always resolves to a usable month. A hand-typed `?month=banana` is not a
 * bug worth a 500 — it falls back to this month. `.catch` takes a *function* so the default is
 * read at request time; a plain value would freeze "this month" when the module was evaluated.
 */
export const MonthParam = z
  .string()
  .regex(MONTH_RE)
  .catch(() => currentMonth());

/** "2026-09" → "2025-12" at -9. Rolls over the year via Date.UTC's overflow. */
export function monthShift(month: string, by: number): string {
  const [year = 1970, m = 1] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, m - 1 + by, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "2026-09" → "September 2026" */
export function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T12:00:00Z`));
}

/** The month's bare date bounds, half-open: [from, toExclusive). */
export function monthDays(month: string): {
  from: string;
  toExclusive: string;
} {
  return { from: `${month}-01`, toExclusive: `${monthShift(month, 1)}-01` };
}

/**
 * The UTC offset in force in `timeZone` on `date`, as "+03:00".
 *
 * Sampled at midday: EU summer time starts and ends on the last Sunday of March and October, so
 * the first of a month is never a transition day and never ambiguous.
 */
export function zonedOffset(date: string, timeZone = COMPANY_TZ): string {
  const label = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    timeZoneName: "longOffset",
  }).format(new Date(`${date}T12:00:00Z`));
  return label.match(/GMT([+-]\d{2}:\d{2})/)?.[1] ?? "+00:00";
}

/**
 * The month as real instants, for comparing against `timestamptz` columns.
 *
 * `care_events.date` is a bare `date` and compares as a string, but `task_photos.taken_at` is a
 * `timestamptz`: using naive UTC bounds would file a job done at 08:00 on the 1st under the
 * previous month. Half-open — always `.gte(startUtc)` / `.lt(endUtc)`.
 */
export function monthRangeUtc(
  month: string,
  timeZone = COMPANY_TZ,
): { startUtc: string; endUtc: string } {
  const { from, toExclusive } = monthDays(month);
  return {
    startUtc: new Date(
      `${from}T00:00:00${zonedOffset(from, timeZone)}`,
    ).toISOString(),
    endUtc: new Date(
      `${toExclusive}T00:00:00${zonedOffset(toExclusive, timeZone)}`,
    ).toISOString(),
  };
}
