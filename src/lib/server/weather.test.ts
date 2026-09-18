/// <reference types="bun" />
import { describe, expect, test } from "bun:test";

import type { OpenMeteoSite } from "@/lib/weather";

import { loadForecasts, memoryWeatherCache, WEATHER_TTL_MS } from "./weather";

const NOW = new Date("2026-09-21T06:00:00Z");
const sites = [
  { id: "p1", lat: 59.42, lng: 24.8 },
  { id: "p4", lat: 56.98, lng: 24.13 },
];

function payload(tempMax: number): OpenMeteoSite {
  return {
    latitude: 0,
    longitude: 0,
    hourly: {
      time: ["2026-09-21T00:00"],
      precipitation: [1],
      temperature_2m: [9],
    },
    daily: {
      time: ["2026-09-21"],
      precipitation_sum: [1],
      temperature_2m_max: [tempMax],
      weather_code: [3],
    },
  };
}

function fakeFetch(response: unknown) {
  const calls: string[] = [];
  const fn = async (url: string) => {
    calls.push(url);
    if (response instanceof Error) throw response;
    return response;
  };
  return { fn, calls };
}

describe("loadForecasts", () => {
  test("fetches every site in one request, then serves from cache", async () => {
    const cache = memoryWeatherCache();
    const first = fakeFetch([payload(14), payload(16)]);
    const a = await loadForecasts(sites, cache, first.fn, NOW);
    expect(first.calls).toHaveLength(1);
    expect(a.forecasts["p4"]?.daily[0]?.tempMaxC).toBe(16);
    expect(a.stale).toBe(false);

    const second = fakeFetch(new Error("should not be called"));
    const later = new Date(NOW.getTime() + 60_000);
    const b = await loadForecasts(sites, cache, second.fn, later);
    expect(second.calls).toHaveLength(0);
    expect(b.fetchedAt).toBe(a.fetchedAt);
  });

  test("refetches once the cache is older than the TTL", async () => {
    const cache = memoryWeatherCache();
    await loadForecasts(
      sites,
      cache,
      fakeFetch([payload(14), payload(16)]).fn,
      NOW,
    );
    const later = new Date(NOW.getTime() + WEATHER_TTL_MS + 1);
    const refresh = fakeFetch([payload(20), payload(21)]);
    const out = await loadForecasts(sites, cache, refresh.fn, later);
    expect(refresh.calls).toHaveLength(1);
    expect(out.forecasts["p1"]?.daily[0]?.tempMaxC).toBe(20);
  });

  test("when the API is down, stale cached data is served and flagged", async () => {
    const cache = memoryWeatherCache();
    await loadForecasts(
      sites,
      cache,
      fakeFetch([payload(14), payload(16)]).fn,
      NOW,
    );
    const later = new Date(NOW.getTime() + WEATHER_TTL_MS + 1);
    const out = await loadForecasts(
      sites,
      cache,
      fakeFetch(new Error("offline")).fn,
      later,
    );
    expect(out.stale).toBe(true);
    expect(out.forecasts["p1"]?.daily[0]?.tempMaxC).toBe(14);
  });

  test("with no data at all it throws instead of inventing weather", async () => {
    const fetchFails = fakeFetch(new Error("offline"));
    await expect(
      loadForecasts(sites, memoryWeatherCache(), fetchFails.fn, NOW),
    ).rejects.toThrow("Weather unavailable: offline");
  });

  test("a broken cache is treated as a miss, not an outage", async () => {
    const broken = {
      get: async () => {
        throw new Error("db down");
      },
      set: async () => {
        throw new Error("db down");
      },
    };
    const out = await loadForecasts(
      sites,
      broken,
      fakeFetch([payload(14), payload(16)]).fn,
      NOW,
    );
    expect(Object.keys(out.forecasts)).toEqual(["p1", "p4"]);
  });

  test("a response with the wrong number of sites is rejected", async () => {
    await expect(
      loadForecasts(
        sites,
        memoryWeatherCache(),
        fakeFetch([payload(14)]).fn,
        NOW,
      ),
    ).rejects.toThrow(
      "Weather unavailable: Open-Meteo returned 1 sites, expected 2",
    );
  });
});
