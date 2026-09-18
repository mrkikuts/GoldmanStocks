export type PlantStatus = "healthy" | "attention" | "critical";

export type Project = {
  id: string;
  name: string;
  clientId: string;
  client: string;
  city: string;
  address: string;
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
  workerId: string;
  day: number; // 0 = Monday
  start: number; // hour, 24h
  duration: number; // hours
  kind: "Watering" | "Clipping" | "Mowing" | "Planting" | "Inspection" | "Feeding";
  weatherNote?: string;
  status: "planned" | "done" | "skipped";
};

export const workers: Worker[] = [
  { id: "w1", name: "Mart Kivi", role: "Head gardener", language: "ET", color: "var(--chart-1)" },
  { id: "w2", name: "Liis Tamm", role: "Gardener", language: "ET", color: "var(--chart-2)" },
  { id: "w3", name: "Janis Ozols", role: "Seasonal", language: "LV", color: "var(--chart-3)" },
  { id: "w4", name: "Kaisa Rand", role: "Tree care", language: "EN", color: "var(--chart-5)" },
];

export const clients: Client[] = [
  {
    id: "c1",
    name: "Ülemiste Business Park",
    city: "Tallinn",
    sites: 3,
    plants: 412,
    contact: "Anu Saar",
    hoursThisMonth: 96,
    monthlyValue: 2400,
    contractUntil: "2027-03-31",
    health: "good",
  },
  {
    id: "c2",
    name: "Hotel Nordic Grand",
    city: "Tallinn",
    sites: 1,
    plants: 128,
    contact: "Peeter Lill",
    hoursThisMonth: 54,
    monthlyValue: 1150,
    contractUntil: "2026-12-31",
    health: "good",
  },
  {
    id: "c3",
    name: "Pärnu Seaside Apartments",
    city: "Pärnu",
    sites: 2,
    plants: 96,
    contact: "Kristi Mägi",
    hoursThisMonth: 71,
    monthlyValue: 890,
    contractUntil: "2026-10-15",
    health: "watch",
  },
  {
    id: "c4",
    name: "Riga Green Offices",
    city: "Riga",
    sites: 4,
    plants: 305,
    contact: "Ilze Berzina",
    hoursThisMonth: 118,
    monthlyValue: 2760,
    contractUntil: "2027-01-31",
    health: "good",
  },
  {
    id: "c5",
    name: "Villa Kadriorg",
    city: "Tallinn",
    sites: 1,
    plants: 47,
    contact: "Toomas Vaher",
    hoursThisMonth: 38,
    monthlyValue: 420,
    contractUntil: "2026-09-30",
    health: "at risk",
  },
];

export const projects: Project[] = [
  {
    id: "p1",
    name: "Ülemiste Business Park — grounds",
    clientId: "c1",
    client: "Ülemiste Business Park",
    city: "Tallinn",
    address: "Valukoja 8, Tallinn",
    zones: ["North courtyard", "Parking edge", "Canal walk"],
    leadWorkerId: "w1",
    workerIds: ["w1", "w4", "w2"],
    visitsPerMonth: 8,
    monthlyValue: 2400,
    contractUntil: "2027-03-31",
    status: "attention",
  },
  {
    id: "p2",
    name: "Hotel Nordic Grand — entrance & terrace",
    clientId: "c2",
    client: "Hotel Nordic Grand",
    city: "Tallinn",
    address: "Rävala pst 3, Tallinn",
    zones: ["Front entrance", "Terrace beds"],
    leadWorkerId: "w2",
    workerIds: ["w2", "w1"],
    visitsPerMonth: 6,
    monthlyValue: 1150,
    contractUntil: "2026-12-31",
    status: "critical",
  },
  {
    id: "p3",
    name: "Pärnu Seaside Apartments — dunes & courtyard",
    clientId: "c3",
    client: "Pärnu Seaside Apartments",
    city: "Pärnu",
    address: "Ranna pst 12, Pärnu",
    zones: ["Dune side", "Courtyard"],
    leadWorkerId: "w2",
    workerIds: ["w2", "w3"],
    visitsPerMonth: 4,
    monthlyValue: 890,
    contractUntil: "2026-10-15",
    status: "attention",
  },
  {
    id: "p4",
    name: "Riga Green Offices — campus",
    clientId: "c4",
    client: "Riga Green Offices",
    city: "Riga",
    address: "Duntes iela 6, Riga",
    zones: ["Building B alley", "Reception garden", "Roof terrace"],
    leadWorkerId: "w3",
    workerIds: ["w3", "w4"],
    visitsPerMonth: 8,
    monthlyValue: 2760,
    contractUntil: "2027-01-31",
    status: "attention",
  },
  {
    id: "p5",
    name: "Villa Kadriorg — private garden",
    clientId: "c5",
    client: "Villa Kadriorg",
    city: "Tallinn",
    address: "Koidula 14, Tallinn",
    zones: ["Back garden", "Front slope"],
    leadWorkerId: "w1",
    workerIds: ["w1", "w3"],
    visitsPerMonth: 4,
    monthlyValue: 420,
    contractUntil: "2026-09-30",
    status: "critical",
  },
];

export const plants: Plant[] = [
  {
    id: "PL-0142",
    projectId: "p1",
    species: "Tilia cordata",
    common: "Small-leaved lime",
    kind: "Tree",
    client: "Ülemiste Business Park",
    site: "North courtyard",
    status: "healthy",
    lastCare: "12 Sep",
    nextCare: "24 Sep",
    nextTask: "Crown inspection",
    x: 28,
    y: 24,
  },
  {
    id: "PL-0143",
    projectId: "p1",
    species: "Thuja occidentalis",
    common: "White cedar hedge",
    kind: "Hedge",
    client: "Ülemiste Business Park",
    site: "Parking edge",
    status: "attention",
    lastCare: "02 Sep",
    nextCare: "21 Sep",
    nextTask: "Clipping",
    x: 68,
    y: 38,
  },
  {
    id: "PL-0156",
    projectId: "p1",
    species: "Betula pendula",
    common: "Silver birch row",
    kind: "Tree",
    client: "Ülemiste Business Park",
    site: "Canal walk",
    status: "healthy",
    lastCare: "10 Sep",
    nextCare: "05 Oct",
    nextTask: "Stake check",
    x: 46,
    y: 72,
  },
  {
    id: "PL-0161",
    projectId: "p1",
    species: "Lolium perenne",
    common: "Courtyard lawn",
    kind: "Lawn",
    client: "Ülemiste Business Park",
    site: "North courtyard",
    status: "attention",
    lastCare: "13 Sep",
    nextCare: "22 Sep",
    nextTask: "Mowing",
    x: 18,
    y: 55,
  },
  {
    id: "PL-0210",
    projectId: "p2",
    species: "Festuca rubra",
    common: "Main lawn",
    kind: "Lawn",
    client: "Hotel Nordic Grand",
    site: "Front entrance",
    status: "healthy",
    lastCare: "15 Sep",
    nextCare: "22 Sep",
    nextTask: "Mowing",
    x: 32,
    y: 30,
  },
  {
    id: "PL-0288",
    projectId: "p2",
    species: "Hydrangea macrophylla",
    common: "Bigleaf hydrangea",
    kind: "Shrub",
    client: "Hotel Nordic Grand",
    site: "Terrace beds",
    status: "critical",
    lastCare: "28 Aug",
    nextCare: "Today",
    nextTask: "Deep watering + feeding",
    x: 70,
    y: 62,
  },
  {
    id: "PL-0292",
    projectId: "p2",
    species: "Taxus baccata",
    common: "Yew planters",
    kind: "Shrub",
    client: "Hotel Nordic Grand",
    site: "Front entrance",
    status: "healthy",
    lastCare: "12 Sep",
    nextCare: "30 Sep",
    nextTask: "Shape pruning",
    x: 50,
    y: 20,
  },
  {
    id: "PL-0301",
    projectId: "p3",
    species: "Rosa rugosa",
    common: "Beach rose bed",
    kind: "Flower bed",
    client: "Pärnu Seaside Apartments",
    site: "Dune side",
    status: "attention",
    lastCare: "09 Sep",
    nextCare: "23 Sep",
    nextTask: "Dead-heading",
    x: 24,
    y: 66,
  },
  {
    id: "PL-0455",
    projectId: "p3",
    species: "Lavandula angustifolia",
    common: "Lavender border",
    kind: "Flower bed",
    client: "Pärnu Seaside Apartments",
    site: "Courtyard",
    status: "healthy",
    lastCare: "14 Sep",
    nextCare: "28 Sep",
    nextTask: "Light pruning",
    x: 62,
    y: 34,
  },
  {
    id: "PL-0461",
    projectId: "p3",
    species: "Pinus mugo",
    common: "Dwarf pine group",
    kind: "Shrub",
    client: "Pärnu Seaside Apartments",
    site: "Dune side",
    status: "healthy",
    lastCare: "08 Sep",
    nextCare: "12 Oct",
    nextTask: "Inspection",
    x: 40,
    y: 80,
  },
  {
    id: "PL-0355",
    projectId: "p4",
    species: "Acer platanoides",
    common: "Norway maple",
    kind: "Tree",
    client: "Riga Green Offices",
    site: "Building B alley",
    status: "healthy",
    lastCare: "11 Sep",
    nextCare: "02 Oct",
    nextTask: "Stake check",
    x: 30,
    y: 26,
  },
  {
    id: "PL-0372",
    projectId: "p4",
    species: "Buxus sempervirens",
    common: "Box hedge",
    kind: "Hedge",
    client: "Riga Green Offices",
    site: "Reception garden",
    status: "attention",
    lastCare: "30 Aug",
    nextCare: "21 Sep",
    nextTask: "Clipping",
    x: 64,
    y: 48,
  },
  {
    id: "PL-0380",
    projectId: "p4",
    species: "Sedum spurium",
    common: "Roof sedum mat",
    kind: "Flower bed",
    client: "Riga Green Offices",
    site: "Roof terrace",
    status: "attention",
    lastCare: "01 Sep",
    nextCare: "25 Sep",
    nextTask: "Weeding + feeding",
    x: 44,
    y: 76,
  },
  {
    id: "PL-0398",
    projectId: "p5",
    species: "Syringa vulgaris",
    common: "Common lilac",
    kind: "Shrub",
    client: "Villa Kadriorg",
    site: "Back garden",
    status: "critical",
    lastCare: "18 Aug",
    nextCare: "Today",
    nextTask: "Watering + mulch",
    x: 66,
    y: 58,
  },
  {
    id: "PL-0401",
    projectId: "p5",
    species: "Poa pratensis",
    common: "Meadow lawn",
    kind: "Lawn",
    client: "Villa Kadriorg",
    site: "Front slope",
    status: "healthy",
    lastCare: "16 Sep",
    nextCare: "26 Sep",
    nextTask: "Mowing",
    x: 28,
    y: 34,
  },
];

export const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
export const weekDates = ["21 Sep", "22 Sep", "23 Sep", "24 Sep", "25 Sep"];

export const weather = [
  { day: "Mon", icon: "rain", temp: 12, note: "18 watering tasks skipped" },
  { day: "Tue", icon: "cloud", temp: 14, note: "Good for clipping" },
  { day: "Wed", icon: "sun", temp: 18, note: "Warm — move clipping earlier" },
  { day: "Thu", icon: "sun", temp: 19, note: "Watering back on" },
  { day: "Fri", icon: "cloud", temp: 15, note: "Planting window" },
];

export const tasks: Task[] = [
  {
    id: "t1",
    title: "Hedge clipping",
    projectId: "p1",
    client: "Ülemiste Business Park",
    site: "Parking edge",
    workerId: "w1",
    day: 0,
    start: 8,
    duration: 3,
    kind: "Clipping",
    status: "planned",
  },
  {
    id: "t2",
    title: "Crown inspection",
    projectId: "p1",
    client: "Ülemiste Business Park",
    site: "North courtyard",
    workerId: "w4",
    day: 0,
    start: 9,
    duration: 2,
    kind: "Inspection",
    status: "planned",
  },
  {
    id: "t3",
    title: "Watering round",
    projectId: "p2",
    client: "Hotel Nordic Grand",
    site: "Terrace beds",
    workerId: "w2",
    day: 0,
    start: 8,
    duration: 2,
    kind: "Watering",
    weatherNote: "Skipped — 9 mm rain overnight",
    status: "skipped",
  },
  {
    id: "t4",
    title: "Lawn mowing",
    projectId: "p2",
    client: "Hotel Nordic Grand",
    site: "Front entrance",
    workerId: "w2",
    day: 1,
    start: 8,
    duration: 3,
    kind: "Mowing",
    status: "planned",
  },
  {
    id: "t5",
    title: "Box hedge clipping",
    projectId: "p4",
    client: "Riga Green Offices",
    site: "Reception garden",
    workerId: "w3",
    day: 1,
    start: 9,
    duration: 4,
    kind: "Clipping",
    status: "planned",
  },
  {
    id: "t6",
    title: "Rose bed dead-heading",
    projectId: "p3",
    client: "Pärnu Seaside Apartments",
    site: "Dune side",
    workerId: "w2",
    day: 2,
    start: 10,
    duration: 2,
    kind: "Clipping",
    status: "planned",
  },
  {
    id: "t7",
    title: "Deep watering",
    projectId: "p5",
    client: "Villa Kadriorg",
    site: "Back garden",
    workerId: "w1",
    day: 2,
    start: 8,
    duration: 2,
    kind: "Watering",
    weatherNote: "Moved earlier — warm spell",
    status: "planned",
  },
  {
    id: "t8",
    title: "Feeding round",
    projectId: "p4",
    client: "Riga Green Offices",
    site: "Building B alley",
    workerId: "w3",
    day: 3,
    start: 8,
    duration: 3,
    kind: "Feeding",
    status: "planned",
  },
  {
    id: "t9",
    title: "Lime tree stake check",
    projectId: "p1",
    client: "Ülemiste Business Park",
    site: "North courtyard",
    workerId: "w4",
    day: 3,
    start: 12,
    duration: 2,
    kind: "Inspection",
    status: "planned",
  },
  {
    id: "t10",
    title: "Autumn bulb planting",
    projectId: "p3",
    client: "Pärnu Seaside Apartments",
    site: "Courtyard",
    workerId: "w2",
    day: 4,
    start: 9,
    duration: 4,
    kind: "Planting",
    status: "planned",
  },
  {
    id: "t11",
    title: "Meadow lawn mowing",
    projectId: "p5",
    client: "Villa Kadriorg",
    site: "Front slope",
    workerId: "w1",
    day: 4,
    start: 8,
    duration: 2,
    kind: "Mowing",
    status: "planned",
  },
  {
    id: "t12",
    title: "Lilac watering + mulch",
    projectId: "p5",
    client: "Villa Kadriorg",
    site: "Back garden",
    workerId: "w3",
    day: 0,
    start: 13,
    duration: 2,
    kind: "Watering",
    status: "done",
  },
];

export const revenueOpportunities = [
  { client: "Ülemiste Business Park", what: "Hedge clipping due next week", value: 780 },
  { client: "Riga Green Offices", what: "Box hedge + alley pruning", value: 1240 },
  { client: "Hotel Nordic Grand", what: "Autumn lawn renovation", value: 640 },
  { client: "Pärnu Seaside Apartments", what: "Bulb planting package", value: 540 },
];

export const statusLabel: Record<PlantStatus, string> = {
  healthy: "Healthy",
  attention: "Needs attention",
  critical: "Critical",
};

export function getProject(id: string) {
  return projects.find((p) => p.id === id);
}

export function projectPlants(projectId: string) {
  return plants.filter((p) => p.projectId === projectId);
}

export function projectTasks(projectId: string) {
  return tasks.filter((t) => t.projectId === projectId);
}

export function getWorker(id: string) {
  return workers.find((w) => w.id === id);
}

export function projectWorkers(projectId: string) {
  const project = getProject(projectId);
  if (!project) return [];
  return project.workerIds
    .map((id) => getWorker(id))
    .filter((w): w is Worker => Boolean(w))
    .map((w) => {
      const own = projectTasks(projectId).filter((t) => t.workerId === w.id);
      return {
        ...w,
        isLead: project.leadWorkerId === w.id,
        tasksThisWeek: own.length,
        hoursThisWeek: own.reduce((sum, t) => sum + t.duration, 0),
      };
    });
}
