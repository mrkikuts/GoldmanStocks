/**
 * Shared domain types — the contract between track A (data/CRUD/auth) and track B
 * (weather/planner/LLM/photos). Field names mirror supabase/migrations/0001_init.sql
 * (camelCase here, snake_case in SQL). Changing a field or type name after step 0
 * means telling the other track first.
 */

export type PlantStatus = "healthy" | "attention" | "critical";

export type Project = {
  id: string;
  name: string;
  clientId: string;
  client: string;
  city: string;
  address: string;
  /** site coordinates, used for the weather lookup and route ordering between sites */
  lat: number;
  lng: number;
  zones: string[];
  leadWorkerId: string;
  workerIds: string[];
  visitsPerMonth: number;
  monthlyValue: number;
  contractUntil: string;
  status: PlantStatus;
};

export type Plant = {
  id: string;
  projectId: string;
  species: string;
  common: string;
  kind: "Tree" | "Hedge" | "Lawn" | "Flower bed" | "Shrub";
  client: string;
  site: string;
  status: PlantStatus;
  lastCare: string;
  nextCare: string;
  nextTask: string;
  /** map position in percent of the site plan, 0–100 */
  x: number;
  y: number;
};

export type Client = {
  id: string;
  name: string;
  city: string;
  sites: number;
  plants: number;
  contact: string;
  hoursThisMonth: number;
  monthlyValue: number;
  contractUntil: string;
  health: "good" | "watch" | "at risk";
};

export type Worker = {
  id: string;
  name: string;
  role: string;
  language: string;
  color: string;
};

export type Task = {
  id: string;
  title: string;
  projectId: string;
  client: string;
  site: string;
  /** the plant or area the task is about — gives the planner a location within the site */
  plantId?: string;
  workerId: string;
  day: number; // 0 = Monday
  start: number; // hour, 24h
  duration: number; // hours
  kind: "Watering" | "Clipping" | "Mowing" | "Planting" | "Inspection" | "Feeding";
  weatherNote?: string;
  status: "planned" | "done" | "skipped";
  /** ISO timestamp — set when the boss approves the day's plan */
  approvedAt?: string;
};

export type WeatherIcon = "rain" | "cloud" | "sun";

/** one day in the weather strip on the dashboard and schedule */
export type DayWeather = {
  day: string;
  icon: WeatherIcon;
  temp: number;
  note: string;
};

export type RevenueOpportunity = {
  client: string;
  what: string;
  value: number;
};

export type TaskPhoto = {
  id: string;
  taskId: string;
  /** object path in the private `task-photos` storage bucket */
  storagePath: string;
  takenAt: string;
  lat: number | null;
  lng: number | null;
  createdAt: string;
};

export type OfferStatus = "draft" | "approved" | "dismissed";

/** a drafted repeat-work offer — the boss approves before anything is sent */
export type Offer = {
  id: string;
  clientId: string;
  projectId: string;
  what: string;
  value: number;
  dueDate: string; // YYYY-MM-DD
  subject: string;
  body: string;
  status: OfferStatus;
  createdAt: string;
  approvedAt: string | null;
};
