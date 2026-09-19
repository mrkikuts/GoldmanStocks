/// <reference types="bun" />
import { describe, expect, test } from "bun:test";

import {
  distanceM,
  latLngToPlan,
  planToLatLng,
  plantPosition,
  SITE_HEIGHT_M,
  SITE_WIDTH_M,
} from "./geo";

const site = { lat: 59.422, lng: 24.798 }; // Ülemiste, Tallinn

describe("site plan ↔ GPS", () => {
  test("the plan's centre is the site point", () => {
    expect(planToLatLng(site, 50, 50)).toEqual(site);
  });

  test("the plan spans SITE_WIDTH_M × SITE_HEIGHT_M, y growing south", () => {
    const east = planToLatLng(site, 100, 50);
    const north = planToLatLng(site, 50, 0);
    expect(distanceM(site, east)).toBeCloseTo(SITE_WIDTH_M / 2, 0);
    expect(distanceM(site, north)).toBeCloseTo(SITE_HEIGHT_M / 2, 0);
    expect(north.lat).toBeGreaterThan(site.lat);
    expect(east.lng).toBeGreaterThan(site.lng);
  });

  test("round trip within the plan", () => {
    for (const [x, y] of [
      [12, 88],
      [50, 50],
      [73.4, 21.9],
    ] as const) {
      const back = latLngToPlan(site, planToLatLng(site, x, y));
      expect(back.x).toBeCloseTo(x, 1);
      expect(back.y).toBeCloseTo(y, 1);
    }
  });

  test("GPS outside the plan is clamped to its edge", () => {
    const far = { lat: site.lat + 0.01, lng: site.lng - 0.01 }; // ~1 km north-west
    expect(latLngToPlan(site, far)).toEqual({ x: 0, y: 0 });
  });
});

describe("plantPosition", () => {
  test("prefers the plant's own GPS", () => {
    const own = { lat: 59.4225, lng: 24.7991 };
    expect(plantPosition({ x: 10, y: 10, ...own }, site)).toEqual(own);
  });

  test("falls back to the site plan, or nothing without a site", () => {
    expect(plantPosition({ x: 50, y: 50 }, site)).toEqual(site);
    expect(plantPosition({ x: 50, y: 50 }, undefined)).toBeNull();
  });
});
