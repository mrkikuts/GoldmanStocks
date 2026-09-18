import type { Task } from "./types";

/**
 * Forecast for one site in the site's local time (Open-Meteo `timezone=auto`).
 * `time` is "YYYY-MM-DDTHH:MM", `date` is "YYYY-MM-DD".
 */
export type SiteForecast = {
  hourly: { time: string; precipMm: number; tempC: number }[];
  daily: {
    date: string;
    precipMm: number;
    tempMaxC: number;
    weatherCode: number;
  }[];
};

export type ForecastByProject = Record<string, SiteForecast | undefined>;

/** Rain from the evening before plus the day itself at or above this skips watering. */
export const RAIN_SKIP_MM = 5;
/** A day whose max temperature reaches this pulls clipping and watering earlier. */
export const WARM_C = 18;

const DAY_START = 7;
/** Tasks starting at or before this hour already run in the cool of the morning. */
const MORNING_END = 8;

const SKIP_PREFIX = "Skipped —";
const MOVED_NOTE = "Moved earlier — warm spell";

// ─── Dates ───────────────────────────────────────────────────────────────────

export function addDays(date: string, days: number): string {
  const [y = 1970, m = 1, d = 1] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// ─── Forecast readings ───────────────────────────────────────────────────────

function rainBetween(forecast: SiteForecast, from: string, to: string) {
  return forecast.hourly
    .filter((h) => h.time >= from && h.time < to)
    .reduce((sum, h) => sum + h.precipMm, 0);
}

/** Rain from 18:00 the evening before until 06:00 on `date`. */
export function overnightRainMm(forecast: SiteForecast, date: string) {
  return rainBetween(forecast, `${addDays(date, -1)}T18:00`, `${date}T06:00`);
}

/** Rain from 06:00 to 18:00 on `date`. */
export function daytimeRainMm(forecast: SiteForecast, date: string) {
  return rainBetween(forecast, `${date}T06:00`, `${date}T18:00`);
}

export function maxTempC(forecast: SiteForecast, date: string) {
  return forecast.daily.find((d) => d.date === date)?.tempMaxC;
}

// ─── Rules ───────────────────────────────────────────────────────────────────

function isWeatherNote(note: string | undefined) {
  return Boolean(note && (note.startsWith(SKIP_PREFIX) || note === MOVED_NOTE));
}

/** Drop the effects of a previous rule run so the rules are re-evaluated from scratch. */
function baseline(task: Task): Task {
  if (!isWeatherNote(task.weatherNote)) return task;
  const { weatherNote, ...rest } = task;
  return weatherNote?.startsWith(SKIP_PREFIX) && task.status === "skipped"
    ? { ...rest, status: "planned" }
    : rest;
}

function overlaps(
  a: { start: number; duration: number },
  start: number,
  duration: number,
) {
  return start < a.start + a.duration && a.start < start + duration;
}

/**
 * Apply the weather rules to a week of tasks and return new task objects (inputs are
 * never mutated). `weekDates[task.day]` is the task's date. Done tasks and days that
 * are already approved are left exactly as they are. Tasks at sites with no forecast
 * lose any earlier weather adjustment — without live data we make no weather claims.
 */
export function applyWeatherRules(
  tasks: Task[],
  forecastByProject: ForecastByProject,
  weekDates: string[],
): Task[] {
  const approvedDays = new Set(
    tasks.filter((t) => t.approvedAt).map((t) => t.day),
  );
  const frozen = (t: Task) => t.status === "done" || approvedDays.has(t.day);
  const context = (t: Task) => {
    const date = weekDates[t.day];
    const forecast = forecastByProject[t.projectId];
    return date && forecast ? { date, forecast } : null;
  };

  // Rain: skip watering.
  const out = tasks.map((task): Task => {
    if (frozen(task)) return task;
    const base = baseline(task);
    const ctx = context(base);
    if (!ctx || base.kind !== "Watering" || base.status !== "planned")
      return base;

    const overnight = overnightRainMm(ctx.forecast, ctx.date);
    const total = overnight + daytimeRainMm(ctx.forecast, ctx.date);
    if (total < RAIN_SKIP_MM) return base;
    const weatherNote =
      overnight >= RAIN_SKIP_MM
        ? `${SKIP_PREFIX} ${Math.round(overnight)} mm rain overnight`
        : `${SKIP_PREFIX} ${Math.round(total)} mm rain expected`;
    return { ...base, status: "skipped", weatherNote };
  });

  // Warm spell: pull clipping and watering into the earliest free earlier slot.
  const candidates = out
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => {
      if (
        frozen(task) ||
        task.status !== "planned" ||
        task.start <= MORNING_END
      )
        return false;
      if (task.kind !== "Clipping" && task.kind !== "Watering") return false;
      const ctx = context(task);
      return (
        ctx !== null &&
        (maxTempC(ctx.forecast, ctx.date) ?? -Infinity) >= WARM_C
      );
    })
    .sort((a, b) => a.task.start - b.task.start);

  for (const { task, index } of candidates) {
    const busy = out.filter(
      (o) =>
        o.id !== task.id &&
        o.workerId === task.workerId &&
        o.day === task.day &&
        o.status !== "skipped",
    );
    for (let hour = DAY_START; hour + task.duration <= task.start; hour++) {
      if (busy.some((b) => overlaps(b, hour, task.duration))) continue;
      out[index] = { ...task, start: hour, weatherNote: MOVED_NOTE };
      break;
    }
  }

  return out;
}

/** One-line summary of what the weather changed on `day`, for the weather strip. */
export function summarizeDay(tasks: Task[], day: number): string {
  const own = tasks.filter((t) => t.day === day);
  const skipped = own.filter(
    (t) => t.status === "skipped" && t.weatherNote?.startsWith(SKIP_PREFIX),
  ).length;
  const moved = own.filter((t) => t.weatherNote === MOVED_NOTE).length;

  const parts: string[] = [];
  if (skipped)
    parts.push(
      `${skipped} watering ${skipped === 1 ? "task" : "tasks"} skipped`,
    );
  if (moved)
    parts.push(`${moved} ${moved === 1 ? "job" : "jobs"} moved earlier — warm`);
  return parts.join(" · ") || "No weather changes";
}
