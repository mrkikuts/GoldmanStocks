/// <reference types="bun" />
import { describe, expect, test } from "bun:test";

import { inWeek, taskDateIn } from "./task-schedule";
import type { Task } from "./types";

// Mon–Fri of the plan week these tests talk about.
const WEEK = [
  "2026-09-21",
  "2026-09-22",
  "2026-09-23",
  "2026-09-24",
  "2026-09-25",
];

function task(over: Partial<Task> = {}): Task {
  return {
    id: "t1",
    title: "Hedge clipping",
    projectId: "p1",
    client: "Ülemiste City",
    site: "Main entrance",
    workerId: "w1",
    day: 0,
    start: 8,
    duration: 2,
    kind: "Clipping",
    status: "planned",
    ...over,
  };
}

describe("taskDateIn", () => {
  test("an undated task takes the week's date for its weekday", () => {
    expect(taskDateIn(task({ day: 0 }), WEEK)).toBe("2026-09-21");
    expect(taskDateIn(task({ day: 4 }), WEEK)).toBe("2026-09-25");
  });

  test("a dated task keeps its own date, whatever its weekday says", () => {
    // `day` disagreeing with `date` should never happen — the server derives one from the
    // other — but the date is the authority if it ever does.
    expect(taskDateIn(task({ day: 0, date: "2026-11-16" }), WEEK)).toBe(
      "2026-11-16",
    );
  });

  test("a weekday with no date in the week yields an empty string, not a crash", () => {
    // Saturday and Sunday: the plan week is Mon–Fri, so there is no date to take.
    expect(taskDateIn(task({ day: 5 }), WEEK)).toBe("");
  });
});

describe("inWeek", () => {
  test("an undated task is in every week — it is the recurring template", () => {
    expect(inWeek(task({ day: 2 }), WEEK)).toBe(true);
  });

  test("a task dated inside the week is in it", () => {
    expect(inWeek(task({ day: 1, date: "2026-09-22" }), WEEK)).toBe(true);
  });

  test("a task dated in a future month is not", () => {
    expect(inWeek(task({ day: 0, date: "2026-11-16" }), WEEK)).toBe(false);
  });

  test("the weekend either side of the plan week is out", () => {
    expect(inWeek(task({ day: 5, date: "2026-09-26" }), WEEK)).toBe(false);
    expect(inWeek(task({ day: 6, date: "2026-09-20" }), WEEK)).toBe(false);
  });
});
