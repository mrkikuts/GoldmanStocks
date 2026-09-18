import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { proposeDay } from "@/lib/planner";
import { plants, projects, workers } from "@/lib/rootline-data";
import { getWeekWeather } from "@/lib/weather.functions";
import { useTasks } from "@/lib/task-store";
import {
  applyWeatherRules,
  COMPANY_TZ,
  planWeekDates,
  primaryProject,
  todayIndex,
  weatherStrip,
  type ForecastByProject,
} from "@/lib/weather";

const NO_FORECASTS: ForecastByProject = {};

const SHORT_MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(
  " ",
);

/**
 * "YYYY-MM-DD" → "21 Sep" by default (the app's style — ICU would say "Sept"),
 * or any Intl format, e.g. `{ weekday: "long" }` → "Monday".
 */
export function formatDate(iso: string, options?: Intl.DateTimeFormatOptions) {
  if (!options) {
    const [, month = 1, day = 1] = iso.split("-").map(Number);
    return `${String(day).padStart(2, "0")} ${SHORT_MONTHS[month - 1] ?? ""}`;
  }
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {
    ...options,
    timeZone: "UTC",
  });
}

/** "morning" / "afternoon" / "evening" in the company's time zone. */
export function partOfDay(now: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: COMPANY_TZ,
    }).format(now),
  );
  return hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
}

/**
 * Everything the dashboard and schedule need about the plan week: its dates, the
 * live forecast, the tasks with the weather rules applied, the weather strip, and
 * the planner's proposal for any day. Tasks come from the in-memory task store
 * until track A's tasks server functions land.
 */
export function useWeekPlan() {
  const now = useMemo(() => new Date(), []);
  const weekDates = useMemo(() => planWeekDates(now), [now]);
  const today = todayIndex(now);

  const weather = useQuery({
    queryKey: ["week-weather"],
    queryFn: () => getWeekWeather(),
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });
  const forecasts = weather.data?.forecasts ?? NO_FORECASTS;

  const tasks = useTasks();
  const adjusted = useMemo(
    () => applyWeatherRules(tasks, forecasts, weekDates),
    [tasks, forecasts, weekDates],
  );

  const strip = useMemo(() => {
    const primary = primaryProject(projects);
    return weatherStrip(
      primary ? forecasts[primary.id] : undefined,
      weekDates,
      adjusted,
    );
  }, [forecasts, weekDates, adjusted]);

  const propose = useCallback(
    (day: number) =>
      proposeDay(
        { tasks, workers, projects, plants },
        day,
        forecasts,
        weekDates,
      ),
    [tasks, forecasts, weekDates],
  );

  return {
    now,
    weekDates,
    today,
    weather,
    forecasts,
    tasks,
    adjusted,
    strip,
    propose,
  };
}
