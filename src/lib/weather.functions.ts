import { createServerFn } from "@tanstack/react-start";

import { getAuthedClient } from "@/lib/api/session";
import {
  fetchOpenMeteoJson,
  loadForecasts,
  supabaseWeatherCache,
  trimToPlanWindow,
} from "@/lib/server/weather";

// Server functions only: safe to import from routes. The handler (and everything it
// imports from src/lib/server/) runs on the server; the browser gets an RPC stub.

export type { WeekWeather } from "@/lib/server/weather";

/**
 * This week's forecast for every site, at the sites' coordinates in the database (so a site
 * added or moved on the map gets its own forecast). Cached in `weather_cache` for 3 hours.
 */
export const getWeekWeather = createServerFn({ method: "GET" }).handler(
  async () => {
    const now = new Date();
    const db = await getAuthedClient();
    const { data: sites, error } = await db
      .from("projects")
      .select("id, lat, lng")
      .order("id");
    if (error) throw new Error(error.message);

    const week = await loadForecasts(
      (sites ?? []).map((p) => ({
        id: p.id,
        lat: Number(p.lat),
        lng: Number(p.lng),
      })),
      supabaseWeatherCache(db),
      fetchOpenMeteoJson,
      now,
    );
    return trimToPlanWindow(week, now);
  },
);
