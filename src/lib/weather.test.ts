/// <reference types="bun" />
import { describe, expect, test } from "bun:test";

import type { Task } from "./types";
import {
  addDays,
  applyWeatherRules,
  overnightRainMm,
  summarizeDay,
  type SiteForecast,
} from "./weather";

const MON = "2026-09-21";
const WEEK = [MON, "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25"];

function forecast(
  rain: Record<string, number> = {},
  tempMax: Record<string, number> = {},
): SiteForecast {
  return {
    hourly: Object.entries(rain).map(([time, precipMm]) => ({
      time,
      precipMm,
      tempC: 10,
    })),
    daily: WEEK.map((date) => ({
      date,
      precipMm: 0,
      tempMaxC: tempMax[date] ?? 12,
      weatherCode: 3,
    })),
  };
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "t",
    title: "Watering round",
    projectId: "p1",
    client: "Client",
    site: "Site",
    workerId: "w1",
    day: 0,
    start: 10,
    duration: 2,
    kind: "Watering",
    status: "planned",
    ...overrides,
  };
}

const rainyNight = forecast({ "2026-09-20T22:00": 5, "2026-09-21T02:00": 4 });

describe("dates and readings", () => {
  test("addDays crosses month boundaries", () => {
    expect(addDays("2026-10-01", -1)).toBe("2026-09-30");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  test("overnight window is 18:00 the evening before until 06:00", () => {
    const f = forecast({
      "2026-09-20T17:00": 50, // before the window
      "2026-09-20T18:00": 1,
      "2026-09-21T05:00": 2,
      "2026-09-21T06:00": 50, // after the window
    });
    expect(overnightRainMm(f, MON)).toBe(3);
  });
});

describe("rain rule", () => {
  test("9 mm overnight skips watering with the schedule's note", () => {
    const [out] = applyWeatherRules([task()], { p1: rainyNight }, WEEK);
    expect(out?.status).toBe("skipped");
    expect(out?.weatherNote).toBe("Skipped — 9 mm rain overnight");
  });

  test("2 mm leaves watering alone", () => {
    const f = forecast({ "2026-09-21T01:00": 2 });
    const [out] = applyWeatherRules([task()], { p1: f }, WEEK);
    expect(out?.status).toBe("planned");
    expect(out?.weatherNote).toBeUndefined();
  });

  test("overnight + daytime rain together can skip, with an 'expected' note", () => {
    const f = forecast({ "2026-09-21T01:00": 3, "2026-09-21T12:00": 3 });
    const [out] = applyWeatherRules([task()], { p1: f }, WEEK);
    expect(out?.weatherNote).toBe("Skipped — 6 mm rain expected");
  });

  test("only watering is skipped", () => {
    const [out] = applyWeatherRules(
      [task({ kind: "Mowing" })],
      { p1: rainyNight },
      WEEK,
    );
    expect(out?.status).toBe("planned");
  });

  test("done tasks and approved days are never touched", () => {
    const done = task({ id: "a", status: "done" });
    const approved = task({
      id: "b",
      day: 1,
      approvedAt: "2026-09-18T08:00:00Z",
    });
    const f = forecast({ "2026-09-20T22:00": 9, "2026-09-21T22:00": 9 });
    const out = applyWeatherRules([done, approved], { p1: f }, WEEK);
    expect(out).toEqual([done, approved]);
  });

  test("a stale weather skip is undone when the forecast is dry", () => {
    const stale = task({
      status: "skipped",
      weatherNote: "Skipped — 9 mm rain overnight",
    });
    const [out] = applyWeatherRules([stale], { p1: forecast() }, WEEK);
    expect(out?.status).toBe("planned");
    expect(out?.weatherNote).toBeUndefined();
  });

  test("a stale weather skip is undone when there is no forecast at all", () => {
    const stale = task({
      status: "skipped",
      weatherNote: "Skipped — 9 mm rain overnight",
    });
    const [out] = applyWeatherRules([stale], {}, WEEK);
    expect(out?.status).toBe("planned");
  });

  test("a task the boss skipped by hand stays skipped", () => {
    const manual = task({ status: "skipped" });
    const [out] = applyWeatherRules([manual], { p1: forecast() }, WEEK);
    expect(out?.status).toBe("skipped");
  });

  test("inputs are not mutated", () => {
    const input = task();
    applyWeatherRules([input], { p1: rainyNight }, WEEK);
    expect(input.status).toBe("planned");
  });
});

describe("warm-spell rule", () => {
  const warm = forecast({}, { [MON]: 21 });

  test("clipping moves to the earliest free slot without overlapping", () => {
    const busy = task({ id: "busy", kind: "Mowing", start: 7, duration: 3 }); // 07–10
    const clip = task({ id: "clip", kind: "Clipping", start: 14, duration: 2 });
    const out = applyWeatherRules([busy, clip], { p1: warm }, WEEK);
    const moved = out.find((t) => t.id === "clip");
    expect(moved?.start).toBe(10);
    expect(moved?.weatherNote).toBe("Moved earlier — warm spell");
  });

  test("other workers' tasks don't block the slot", () => {
    const other = task({
      id: "other",
      workerId: "w2",
      kind: "Mowing",
      start: 7,
      duration: 4,
    });
    const clip = task({ id: "clip", kind: "Clipping", start: 14 });
    const out = applyWeatherRules([other, clip], { p1: warm }, WEEK);
    expect(out.find((t) => t.id === "clip")?.start).toBe(7);
  });

  test("tasks already in the morning stay put", () => {
    const [out] = applyWeatherRules(
      [task({ kind: "Clipping", start: 8 })],
      { p1: warm },
      WEEK,
    );
    expect(out?.start).toBe(8);
    expect(out?.weatherNote).toBeUndefined();
  });

  test("a cool day moves nothing", () => {
    const [out] = applyWeatherRules(
      [task({ kind: "Clipping", start: 14 })],
      { p1: forecast() },
      WEEK,
    );
    expect(out?.start).toBe(14);
  });

  test("no free earlier slot means no move", () => {
    const busy = task({ id: "busy", kind: "Mowing", start: 7, duration: 7 }); // 07–14
    const clip = task({ id: "clip", kind: "Clipping", start: 14 });
    const out = applyWeatherRules([busy, clip], { p1: warm }, WEEK);
    expect(out.find((t) => t.id === "clip")?.start).toBe(14);
  });
});

describe("summarizeDay", () => {
  test("counts skips and moves for the day", () => {
    const tasks = [
      task({
        id: "a",
        status: "skipped",
        weatherNote: "Skipped — 9 mm rain overnight",
      }),
      task({
        id: "b",
        status: "skipped",
        weatherNote: "Skipped — 7 mm rain expected",
      }),
      task({
        id: "c",
        kind: "Clipping",
        weatherNote: "Moved earlier — warm spell",
      }),
      task({
        id: "d",
        day: 1,
        status: "skipped",
        weatherNote: "Skipped — 5 mm rain overnight",
      }),
    ];
    expect(summarizeDay(tasks, 0)).toBe(
      "2 watering tasks skipped · 1 job moved earlier — warm",
    );
    expect(summarizeDay(tasks, 2)).toBe("No weather changes");
  });
});
