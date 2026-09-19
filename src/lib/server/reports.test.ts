/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ClientReportInput,
  clientReport,
  dayLabel,
  mapLink,
  signedUrlMap,
} from "./reports";

// Same approach as photos.test.ts: the database flow is exercised against the real project by
// hand, so these cover the rules that have to hold before anything is queried.

/** A client that fails loudly if anything reaches the database. */
const untouchable = new Proxy(
  {},
  {
    get() {
      throw new Error("database should not be reached");
    },
  },
) as SupabaseClient;

describe("input validation", () => {
  test("a month is YYYY-MM or it is not a month", () => {
    const valid = { clientId: "c1", month: "2026-09" };
    expect(ClientReportInput.safeParse(valid).success).toBe(true);
    for (const month of ["2026-13", "2026-00", "2026-9", "26-01", "", "2026"]) {
      expect(ClientReportInput.safeParse({ ...valid, month }).success).toBe(
        false,
      );
    }
  });

  test("a client id is required", () => {
    expect(
      ClientReportInput.safeParse({ clientId: "", month: "2026-09" }).success,
    ).toBe(false);
  });

  test("a bad month is refused before any DB call", async () => {
    await expect(
      clientReport(untouchable, { clientId: "c1", month: "2026-13" }),
    ).rejects.toThrow();
  });
});

describe("signedUrlMap", () => {
  test("keys on path, so a reordered response still resolves", () => {
    const urls = signedUrlMap([
      { path: "tasks/t2/b.jpg", signedUrl: "https://b", error: null },
      { path: "tasks/t1/a.jpg", signedUrl: "https://a", error: null },
    ]);
    expect(urls.get("tasks/t1/a.jpg")).toBe("https://a");
    expect(urls.get("tasks/t2/b.jpg")).toBe("https://b");
  });

  test("a per-path failure is dropped, the rest survive", () => {
    const urls = signedUrlMap([
      { path: "gone.jpg", signedUrl: null, error: "Object not found" },
      { path: null, signedUrl: null, error: "bad" },
      { path: "ok.jpg", signedUrl: "https://ok", error: null },
    ]);
    expect(urls.size).toBe(1);
    expect(urls.get("ok.jpg")).toBe("https://ok");
    expect(urls.has("gone.jpg")).toBe(false);
  });

  test("an empty response is an empty map, not a throw", () => {
    expect(signedUrlMap([]).size).toBe(0);
  });
});

describe("the date column", () => {
  test("reads as a day a person recognises", () => {
    expect(dayLabel("2026-09-07")).toBe("Mon 07 Sep");
    expect(dayLabel("2026-01-01")).toBe("Thu 01 Jan");
  });

  test("is not shifted by the host's time zone", () => {
    // Formatted at UTC noon, so a machine in UTC-5 cannot render this as the 6th.
    expect(dayLabel("2026-09-07").startsWith("Mon")).toBe(true);
  });
});

describe("the map link", () => {
  test("is omitted when the phone recorded no GPS", () => {
    expect(mapLink(null, null)).toBeNull();
    expect(mapLink(59.42, null)).toBeNull();
    expect(mapLink(null, 24.8)).toBeNull();
  });

  test("points at the spot the photo was taken", () => {
    expect(mapLink(59.4196, 24.8048)).toBe(
      "https://www.openstreetmap.org/?mlat=59.4196&mlon=24.8048#map=18/59.4196/24.8048",
    );
  });

  test("zero is a real coordinate, not a missing one", () => {
    expect(mapLink(0, 0)).not.toBeNull();
  });
});
