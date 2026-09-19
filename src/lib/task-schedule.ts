import type { Task } from "./types";

/**
 * Placing a task on the calendar.
 *
 * A task has always been a recurring weekly template — a `day` (0 = Monday) and a `start` hour,
 * repeating every week. Migration 0004 added an optional `date`, which makes a task a one-off on
 * that calendar date instead. Both kinds live in the same table, so every view that asks "what is
 * on this date?" has to handle the two together, and these two helpers are the single answer.
 *
 * Kept out of `src/lib/server/` deliberately: routes, components and hooks all need it, and
 * anything under `server/` is denied in the browser.
 */

/**
 * The date a task falls on within the given plan week. An undated task takes the week's date for
 * its weekday; a dated one is simply itself.
 */
export function taskDateIn(task: Task, weekDates: string[]): string {
  return task.date ?? weekDates[task.day] ?? "";
}

/**
 * Is the task part of this plan week? Undated tasks always are — they repeat every week. A dated
 * task only counts when its date is one of the week's, so a job scheduled for a future month
 * stays out of this week's hours, the worker's day and the site's schedule.
 */
export function inWeek(task: Task, weekDates: string[]): boolean {
  return !task.date || weekDates.includes(task.date);
}
