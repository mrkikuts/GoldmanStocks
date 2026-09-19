/// <reference types="bun" />
import { describe, expect, test } from "bun:test";

import {
  currentMonth,
  MONTH_RE,
  MonthParam,
  monthDays,
  monthLabel,
  monthRangeUtc,
  monthShift,
} from "./month";

// The UTC boundaries are the one piece here that is easy to get quietly wrong, so they are
// asserted as literal instants rather than re-derived by the test.

describe("monthRangeUtc", () => {
  test("a summer month starts at 21:00Z the day before (Tallinn is +03:00)", () => {
    expect(monthRangeUtc("2026-09")).toEqual({
      startUtc: "2026-08-31T21:00:00.000Z",
      endUtc: "2026-09-30T21:00:00.000Z",
    });
  });

  test("a winter month starts at 22:00Z (+02:00)", () => {
    expect(monthRangeUtc("2026-12")).toEqual({
      startUtc: "2026-11-30T22:00:00.000Z",
      endUtc: "2026-12-31T22:00:00.000Z",
    });
  });

  test("December's range ends in January", () => {
    expect(monthRangeUtc("2026-12").endUtc.slice(0, 4)).toBe("2026");
    expect(monthDays("2026-12").toExclusive).toBe("2027-01-01");
  });

  test("a month that contains a DST switch still starts on a plain day", () => {
    // Summer time ends on the last Sunday of October, never on the 1st.
    expect(monthRangeUtc("2026-10").startUtc).toBe("2026-09-30T21:00:00.000Z");
    expect(monthRangeUtc("2026-11").startUtc).toBe("2026-10-31T22:00:00.000Z");
  });
});

describe("monthShift", () => {
  test("rolls over both year boundaries", () => {
    expect(monthShift("2026-01", -1)).toBe("2025-12");
    expect(monthShift("2026-12", 1)).toBe("2027-01");
  });

  test("stays put at 0 and handles a long jump", () => {
    expect(monthShift("2026-09", 0)).toBe("2026-09");
    expect(monthShift("2026-09", -12)).toBe("2025-09");
  });
});

describe("currentMonth", () => {
  test("reads the company clock, not UTC", () => {
    // 00:30 UTC on 1 January is already 02:30 in Tallinn — same month here, but the point is
    // that the helper never consults the host's zone.
    expect(currentMonth(new Date("2026-01-01T00:30:00Z"))).toBe("2026-01");
    // 22:30 UTC on 31 December is 00:30 on 1 January in Tallinn: the month has already turned.
    expect(currentMonth(new Date("2026-12-31T22:30:00Z"))).toBe("2027-01");
  });
});

describe("the search param", () => {
  test("a malformed month falls back rather than throwing", () => {
    expect(MonthParam.parse("banana")).toBe(currentMonth());
    expect(MonthParam.parse(undefined)).toBe(currentMonth());
    expect(MonthParam.parse("")).toBe(currentMonth());
  });

  test("month 13 and a two-digit year are not months", () => {
    expect(MONTH_RE.test("2026-13")).toBe(false);
    expect(MONTH_RE.test("2026-00")).toBe(false);
    expect(MONTH_RE.test("2026-9")).toBe(false);
    expect(MONTH_RE.test("26-01")).toBe(false);
    expect(MONTH_RE.test("2026-01")).toBe(true);
  });

  test("a valid month is passed through untouched", () => {
    expect(MonthParam.parse("2026-03")).toBe("2026-03");
  });
});

test("monthLabel reads as a heading", () => {
  expect(monthLabel("2026-09")).toBe("September 2026");
  expect(monthLabel("2027-01")).toBe("January 2027");
});
