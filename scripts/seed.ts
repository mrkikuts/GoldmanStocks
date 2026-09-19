/**
 * Seeds the demo data from src/lib/rootline-data.ts into Supabase.
 *
 *   bun run seed
 *
 * Re-runnable: wipes every table first, so the demo can be reset between runs. Uses the
 * service-role client, which bypasses RLS — the anon/browser path could not do this.
 *
 * Written against the schema that is LIVE in the project (see src/lib/supabase/types.ts).
 * Note the live schema has no denormalised `client` column on projects/plants/tasks — the
 * A4 server functions join through to clients to fill that in for the UI.
 */
import { format } from "date-fns";

import { plantCareEvents, parseShortDate } from "../src/lib/plant-care";
import {
  clients,
  plants,
  projects,
  revenueOpportunities,
  tasks,
  workers,
} from "../src/lib/rootline-data";
import { getAdminClient } from "../src/lib/supabase/server";

const db = getAdminClient();

const COMPANY_ID = "co1";
const COMPANY_NAME = "Rootline Demo Landscaping";

/** Monday of the demo week — `weekDates` in rootline-data.ts starts at 21 Sep 2026. */
const WEEK_START = new Date(2026, 8, 21);

/**
 * Coordinates per project address, for Track B's Open-Meteo lookup. The live schema makes
 * lat/lng NOT NULL, so every project needs one. Approximate to the street — fine for a
 * forecast, worth replacing with surveyed positions if this outlives the demo.
 */
const COORDS: Record<string, { lat: number; lng: number }> = {
  p1: { lat: 59.4215, lng: 24.7985 }, // Valukoja 8, Tallinn
  p2: { lat: 59.4322, lng: 24.753 }, // Rävala pst 3, Tallinn
  p3: { lat: 58.379, lng: 24.487 }, // Ranna pst 12, Pärnu
  p4: { lat: 56.973, lng: 24.115 }, // Duntes iela 6, Riga
  p5: { lat: 59.438, lng: 24.79 }, // Koidula 14, Tallinn
};

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const shortToIso = (value: string) => iso(parseShortDate(value));

/** Throw on the first failure rather than leaving the demo half-seeded. */
function check(label: string, error: { message: string } | null) {
  if (error) throw new Error(`${label}: ${error.message}`);
  console.log(`  ✓ ${label}`);
}

async function wipe() {
  console.log("Clearing existing rows…");
  // Child tables first — every one of these is a foreign key away from the next.
  const order = [
    ["offers", "id"],
    ["task_photos", "id"],
    ["weather_cache", "key"],
    ["care_events", "id"],
    ["tasks", "id"],
    ["plants", "id"],
    ["projects", "id"],
    ["clients", "id"],
    ["workers", "id"],
    ["companies", "id"],
  ] as const;
  for (const [table, key] of order) {
    const { error } = await db.from(table).delete().not(key, "is", null);
    check(`cleared ${table}`, error);
  }
}

async function seed() {
  console.log("\nSeeding…");

  check(
    "companies",
    (
      await db
        .from("companies")
        .insert([{ id: COMPANY_ID, name: COMPANY_NAME }])
    ).error,
  );

  check(
    "workers",
    (
      await db.from("workers").insert(
        workers.map((w) => ({
          id: w.id,
          company_id: COMPANY_ID,
          name: w.name,
          role: w.role,
          language: w.language,
          color: w.color,
          app_role: w.role === "Head gardener" ? "boss" : "worker",
        })),
      )
    ).error,
  );

  check(
    "clients",
    (
      await db.from("clients").insert(
        clients.map((c) => ({
          id: c.id,
          company_id: COMPANY_ID,
          name: c.name,
          city: c.city,
          contact: c.contact,
          sites: c.sites,
          plants: c.plants,
          hours_this_month: c.hoursThisMonth,
          monthly_value: c.monthlyValue,
          contract_until: c.contractUntil,
          health: c.health,
        })),
      )
    ).error,
  );

  check(
    "projects",
    (
      await db.from("projects").insert(
        projects.map((p) => {
          const coords = COORDS[p.id];
          if (!coords)
            throw new Error(
              `No coordinates for project ${p.id} — lat/lng are NOT NULL.`,
            );
          return {
            id: p.id,
            client_id: p.clientId,
            name: p.name,
            city: p.city,
            address: p.address,
            lat: coords.lat,
            lng: coords.lng,
            zones: p.zones,
            lead_worker_id: p.leadWorkerId,
            worker_ids: p.workerIds,
            visits_per_month: p.visitsPerMonth,
            monthly_value: p.monthlyValue,
            contract_until: p.contractUntil,
            status: p.status,
          };
        }),
      )
    ).error,
  );

  check(
    "plants",
    (
      await db.from("plants").insert(
        plants.map((p) => ({
          id: p.id,
          project_id: p.projectId,
          species: p.species,
          common: p.common,
          kind: p.kind,
          site: p.site,
          status: p.status,
          last_care: shortToIso(p.lastCare),
          next_care: shortToIso(p.nextCare),
          next_task: p.nextTask,
          x: p.x,
          y: p.y,
        })),
      )
    ).error,
  );

  check(
    "tasks",
    (
      await db.from("tasks").insert(
        tasks.map((t) => ({
          id: t.id,
          project_id: t.projectId,
          worker_id: t.workerId,
          title: t.title,
          site: t.site,
          // Dropped here until now, which is why every task arrived with a null plant and the
          // client report's "Plant" column was blank for every row.
          plant_id: t.plantId ?? null,
          day: t.day,
          start: t.start,
          duration: t.duration,
          kind: t.kind,
          weather_note: t.weatherNote ?? null,
          status: t.status,
        })),
      )
    ).error,
  );

  // Derived from the same helper the plant calendar renders with, so the seeded history
  // matches what the UI showed before the database existed.
  const workerIdByName = new Map(workers.map((w) => [w.name, w.id]));
  const events = plants.flatMap((plant) =>
    plantCareEvents(plant).map((e) => ({
      plant_id: plant.id,
      worker_id: e.workerName
        ? (workerIdByName.get(e.workerName) ?? null)
        : null,
      date: e.date,
      action: e.action,
      done: e.done,
    })),
  );
  check(
    `care_events (${events.length})`,
    (await db.from("care_events").insert(events)).error,
  );

  // The live offers table carries a real drafted message (subject/body/due_date). B4 replaces
  // these placeholders with LLM-written drafts; seeded so the revenue card has something to show.
  const clientIdByName = new Map(clients.map((c) => [c.name, c.id]));
  const firstProjectByClient = new Map(projects.map((p) => [p.clientId, p.id]));
  const dueDate = iso(new Date(2026, 8, 28));
  check(
    "offers",
    (
      await db.from("offers").insert(
        revenueOpportunities.flatMap((o) => {
          const clientId = clientIdByName.get(o.client);
          const projectId = clientId
            ? firstProjectByClient.get(clientId)
            : undefined;
          if (!clientId || !projectId) return [];
          return [
            {
              client_id: clientId,
              project_id: projectId,
              what: o.what,
              value: o.value,
              due_date: dueDate,
              subject: `${o.what} — proposal for ${o.client}`,
              body: `Hi,\n\nWhile caring for your site we noticed: ${o.what.toLowerCase()}. We can fit this in next week for approximately €${o.value}.\n\nShall we book it in?\n\n— Rootline`,
              status: "draft",
            },
          ];
        }),
      )
    ).error,
  );
}

/** The account the app auto-signs-in as (A5). Idempotent — reuses it if it already exists. */
async function seedBossAccount() {
  const email = process.env["DEMO_BOSS_EMAIL"];
  const password = process.env["DEMO_BOSS_PASSWORD"];
  if (!email || !password) {
    throw new Error(
      "Missing DEMO_BOSS_EMAIL / DEMO_BOSS_PASSWORD — see .env.example.",
    );
  }

  console.log("\nDemo boss account…");
  const { error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error && !/already been registered|already exists/i.test(error.message)) {
    throw new Error(`boss account: ${error.message}`);
  }
  console.log(`  ✓ ${email} ${error ? "(already existed)" : "(created)"}`);
}

await wipe();
await seed();
await seedBossAccount();
console.log("\nDone. Seeded from src/lib/rootline-data.ts.");
