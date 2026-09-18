import { createServerFn } from "@tanstack/react-start";

import type { Plant } from "../rootline-data";
import { clientNameByProject } from "./lookups";
import { toPlant } from "./mappers";
import { getAuthedClient } from "./session";

/** Replaces the `plants` array in rootline-data.ts. */
export const listPlants = createServerFn({ method: "GET" }).handler(
  async (): Promise<Plant[]> => {
    const [{ data, error }, clientByProject] = await Promise.all([
      (await getAuthedClient()).from("plants").select("*").order("id"),
      clientNameByProject(),
    ]);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) =>
      toPlant(row, clientByProject.get(row.project_id) ?? ""),
    );
  },
);

/** Mirrors `projectPlants()` in rootline-data.ts. */
export const projectPlants = createServerFn({ method: "GET" })
  .inputValidator((projectId: string) => projectId)
  .handler(async ({ data: projectId }): Promise<Plant[]> => {
    const [{ data, error }, clientByProject] = await Promise.all([
      (await getAuthedClient())
        .from("plants")
        .select("*")
        .eq("project_id", projectId)
        .order("id"),
      clientNameByProject(),
    ]);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) =>
      toPlant(row, clientByProject.get(row.project_id) ?? ""),
    );
  });
