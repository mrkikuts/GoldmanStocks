import { createServerFn } from "@tanstack/react-start";

import type { Project, Worker } from "../types";
import { clientNameById } from "./lookups";
import { toProject, toWorker } from "./mappers";
import { getAuthedClient } from "./session";

/** Replaces the `projects` array in rootline-data.ts. */
export const listProjects = createServerFn({ method: "GET" }).handler(
  async (): Promise<Project[]> => {
    const [{ data, error }, nameByClient] = await Promise.all([
      (await getAuthedClient()).from("projects").select("*").order("id"),
      clientNameById(),
    ]);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) =>
      toProject(row, nameByClient.get(row.client_id) ?? ""),
    );
  },
);

/** Mirrors `getProject()` in rootline-data.ts — null rather than undefined for a missing id. */
export const getProject = createServerFn({ method: "GET" })
  .inputValidator((projectId: string) => projectId)
  .handler(async ({ data: projectId }): Promise<Project | null> => {
    const [{ data, error }, nameByClient] = await Promise.all([
      (await getAuthedClient())
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle(),
      clientNameById(),
    ]);
    if (error) throw new Error(error.message);
    if (!data) return null;
    return toProject(data, nameByClient.get(data.client_id) ?? "");
  });

export type ProjectWorker = Worker & {
  isLead: boolean;
  tasksThisWeek: number;
  hoursThisWeek: number;
};

/**
 * Mirrors `projectWorkers()` in rootline-data.ts, including the derived per-week counts the
 * project detail page renders.
 */
export const projectWorkers = createServerFn({ method: "GET" })
  .inputValidator((projectId: string) => projectId)
  .handler(async ({ data: projectId }): Promise<ProjectWorker[]> => {
    const db = await getAuthedClient();

    const { data: project, error: pErr } = await db
      .from("projects")
      .select("lead_worker_id, worker_ids")
      .eq("id", projectId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!project) return [];

    const [{ data: workerRows, error: wErr }, { data: taskRows, error: tErr }] =
      await Promise.all([
        db.from("workers").select("*").in("id", project.worker_ids),
        db
          .from("tasks")
          .select("worker_id, duration")
          .eq("project_id", projectId),
      ]);
    if (wErr) throw new Error(wErr.message);
    if (tErr) throw new Error(tErr.message);

    const byId = new Map((workerRows ?? []).map((w) => [w.id, w]));

    // Ordered by the project's own worker_ids, so the crew list reads the same as before.
    return project.worker_ids.flatMap((id) => {
      const row = byId.get(id);
      if (!row) return [];
      const own = (taskRows ?? []).filter((t) => t.worker_id === id);
      return [
        {
          ...toWorker(row),
          isLead: project.lead_worker_id === id,
          tasksThisWeek: own.length,
          hoursThisWeek: own.reduce((sum, t) => sum + Number(t.duration), 0),
        },
      ];
    });
  });
