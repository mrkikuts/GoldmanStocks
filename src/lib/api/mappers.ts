/**
 * Database rows -> the domain types the screens already use.
 *
 * The UI types in `@/lib/rootline-data` are the contract here: every screen, plus PlantMap,
 * PlantCalendar and plant-care.ts, was written against them. Mapping back to that exact shape
 * is what lets A6 be an import swap instead of a rewrite.
 *
 * Two gaps the live schema leaves us to fill:
 *  - projects/plants/tasks have no denormalised `client` name, so callers pass one in.
 *  - dates are real `date` columns, but the UI renders the mock's display strings
 *    ("12 Sep", "Today"), so they are formatted back here.
 */
import { format, parseISO } from "date-fns";

import { TODAY } from "../plant-care";
import type { Client, Plant, Project, Task, Worker } from "../rootline-data";
import type { Database } from "../supabase/types";

type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

/** "2026-09-12" -> "12 Sep", and today's date -> "Today", matching the original mock data. */
export function toShortDate(value: string | null): string {
  if (!value) return "";
  if (value === TODAY) return "Today";
  return format(parseISO(value), "dd MMM");
}

export function toClient(row: Row<"clients">): Client {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    sites: row.sites,
    plants: row.plants,
    contact: row.contact,
    hoursThisMonth: Number(row.hours_this_month),
    monthlyValue: Number(row.monthly_value),
    contractUntil: row.contract_until ?? "",
    health: row.health as Client["health"],
  };
}

export function toWorker(row: Row<"workers">): Worker {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    language: row.language,
    color: row.color,
  };
}

export function toProject(row: Row<"projects">, clientName: string): Project {
  return {
    id: row.id,
    name: row.name,
    clientId: row.client_id,
    client: clientName,
    city: row.city,
    address: row.address,
    zones: row.zones,
    leadWorkerId: row.lead_worker_id ?? "",
    workerIds: row.worker_ids,
    visitsPerMonth: row.visits_per_month,
    monthlyValue: Number(row.monthly_value),
    contractUntil: row.contract_until ?? "",
    status: row.status as Project["status"],
  };
}

export function toPlant(row: Row<"plants">, clientName: string): Plant {
  return {
    id: row.id,
    projectId: row.project_id,
    species: row.species,
    common: row.common,
    kind: row.kind as Plant["kind"],
    client: clientName,
    site: row.site,
    status: row.status as Plant["status"],
    lastCare: toShortDate(row.last_care),
    nextCare: toShortDate(row.next_care),
    nextTask: row.next_task ?? "",
    x: Number(row.x),
    y: Number(row.y),
  };
}

export function toTask(row: Row<"tasks">, clientName: string): Task {
  return {
    id: row.id,
    title: row.title,
    projectId: row.project_id,
    client: clientName,
    site: row.site,
    workerId: row.worker_id,
    day: row.day,
    start: row.start,
    duration: Number(row.duration),
    kind: row.kind as Task["kind"],
    ...(row.weather_note ? { weatherNote: row.weather_note } : {}),
    status: row.status as Task["status"],
  };
}
