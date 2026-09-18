import { createServerFn } from "@tanstack/react-start";

import { projects } from "@/lib/rootline-data";
import {
  defaultWeatherCache,
  fetchOpenMeteoJson,
  loadForecasts,
  trimToPlanWindow,
} from "@/lib/server/weather";

// Server functions only: safe to import from routes. The handler (and everything it
// imports from src/lib/server/) runs on the server; the browser gets an RPC stub.

export type { WeekWeather } from "@/lib/server/weather";

/** This week's forecast for every project site. */
export const getWeekWeather = createServerFn({ method: "GET" }).handler(
  async () => {
    const now = new Date();
    const week = await loadForecasts(
      projects.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng })),
      defaultWeatherCache,
      fetchOpenMeteoJson,
      now,
    );
    return trimToPlanWindow(week, now);
  },
);
