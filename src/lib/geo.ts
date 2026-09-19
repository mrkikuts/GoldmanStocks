import type { Plant } from "./types";

/**
 * Plants were registered on a site plan: x/y in percent of a 16:10 drawing. On the real map
 * that drawing is laid over the site's GPS point as a SITE_WIDTH_M × SITE_HEIGHT_M rectangle,
 * so every existing plant gets a sensible position until it has real coordinates of its own
 * (plants.lat/lng, migration 0003). New plants captured by phone GPS are stored with both.
 */
export const SITE_WIDTH_M = 160;
export const SITE_HEIGHT_M = 100;

const M_PER_DEG_LAT = 111_320;

export type LatLng = { lat: number; lng: number };

function metresPerDegLng(lat: number) {
  return M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

/** Site-plan percent → GPS. x grows east, y grows south (like the drawing). */
export function planToLatLng(site: LatLng, x: number, y: number): LatLng {
  const east = ((x - 50) / 100) * SITE_WIDTH_M;
  const north = ((50 - y) / 100) * SITE_HEIGHT_M;
  return {
    lat: site.lat + north / M_PER_DEG_LAT,
    lng: site.lng + east / metresPerDegLng(site.lat),
  };
}

const clampPct = (v: number) =>
  Math.round(Math.min(100, Math.max(0, v)) * 10) / 10;

/** GPS → site-plan percent, clamped to the plan's edges. */
export function latLngToPlan(
  site: LatLng,
  point: LatLng,
): { x: number; y: number } {
  const east = (point.lng - site.lng) * metresPerDegLng(site.lat);
  const north = (point.lat - site.lat) * M_PER_DEG_LAT;
  return {
    x: clampPct(50 + (east / SITE_WIDTH_M) * 100),
    y: clampPct(50 - (north / SITE_HEIGHT_M) * 100),
  };
}

/** Where to draw a plant: its own GPS position if it has one, else derived from the site plan. */
export function plantPosition(
  plant: Pick<Plant, "x" | "y" | "lat" | "lng">,
  site: LatLng | undefined,
): LatLng | null {
  if (plant.lat != null && plant.lng != null) {
    return { lat: plant.lat, lng: plant.lng };
  }
  return site ? planToLatLng(site, plant.x, plant.y) : null;
}

/** Straight-line distance in metres (fine at site scale). */
export function distanceM(a: LatLng, b: LatLng) {
  const dy = (a.lat - b.lat) * M_PER_DEG_LAT;
  const dx = (a.lng - b.lng) * metresPerDegLng((a.lat + b.lat) / 2);
  return Math.hypot(dx, dy);
}
