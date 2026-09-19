import { getProject, plants, workers, type Plant } from "./rootline-data";

/**
 * The mock data's "today". Only the seed script (and its helpers below) should use this — it
 * generates the demo week around it. App code reads real dates from the database.
 */
export const MOCK_TODAY = "2026-09-21";

export type CareEvent = {
  date: string; // YYYY-MM-DD
  action: string;
  workerName?: string | undefined;
  done: boolean;
  photo?: boolean | undefined;
};

const MONTHS: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Mock "12 Sep" / "Today" strings -> Date in the mock's 2026 (seed data only). */
export function parseShortDate(value: string) {
  if (value.toLowerCase() === "today") return new Date(2026, 8, 21);
  const [day, month] = value.split(" ");
  return new Date(2026, MONTHS[month ?? "Sep"] ?? 8, Number(day) || 1);
}

export const intervalByKind: Record<Plant["kind"], number> = {
  Lawn: 7,
  Hedge: 21,
  Tree: 45,
  "Flower bed": 14,
  Shrub: 14,
};

const rotationByKind: Record<Plant["kind"], string[]> = {
  Lawn: ["Mowing", "Edging", "Feeding", "Mowing"],
  Hedge: ["Clipping", "Weed control", "Shape check", "Clipping"],
  Tree: ["Crown inspection", "Stake check", "Deep watering", "Pruning"],
  "Flower bed": ["Dead-heading", "Weeding", "Watering", "Mulching"],
  Shrub: ["Watering", "Feeding", "Light pruning", "Mulching"],
};

export function plantCareEvents(plant: Plant): CareEvent[] {
  const step = intervalByKind[plant.kind];
  const rotation = rotationByKind[plant.kind];
  const crew = getProject(plant.projectId)?.workerIds ?? [];
  const events: CareEvent[] = [];

  const last = parseShortDate(plant.lastCare);
  for (let i = 0; i < 4; i++) {
    const d = new Date(last);
    d.setDate(d.getDate() - i * step);
    const workerId = crew[i % Math.max(crew.length, 1)];
    events.push({
      date: iso(d),
      action:
        rotation[(rotation.length - i) % rotation.length] ?? "Maintenance",
      workerName: workers.find((w) => w.id === workerId)?.name,
      done: true,
      photo: i < 3,
    });
  }

  const next = parseShortDate(plant.nextCare);
  for (let i = 0; i < 4; i++) {
    const d = new Date(next);
    d.setDate(d.getDate() + i * step);
    const workerId = crew[i % Math.max(crew.length, 1)];
    events.push({
      date: iso(d),
      action:
        i === 0
          ? plant.nextTask
          : (rotation[i % rotation.length] ?? "Maintenance"),
      workerName: workers.find((w) => w.id === workerId)?.name,
      done: false,
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export function getPlant(id: string) {
  return plants.find((p) => p.id === id);
}
