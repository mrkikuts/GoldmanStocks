import { createServerFn } from "@tanstack/react-start";

import type { Task } from "../rootline-data";
import { clientNameByProject } from "./lookups";
import { toTask } from "./mappers";
import { getAuthedClient } from "./session";

/** Replaces the `tasks` array in rootline-data.ts. */
export const listTasks = createServerFn({ method: "GET" }).handler(
  async (): Promise<Task[]> => {
    const [{ data, error }, clientByProject] = await Promise.all([
      (await getAuthedClient())
        .from("tasks")
        .select("*")
        .order("day")
        .order("start"),
      clientNameByProject(),
    ]);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) =>
      toTask(row, clientByProject.get(row.project_id) ?? ""),
    );
  },
);

/** Mirrors `projectTasks()` in rootline-data.ts. */
export const projectTasks = createServerFn({ method: "GET" })
  .inputValidator((projectId: string) => projectId)
  .handler(async ({ data: projectId }): Promise<Task[]> => {
    const [{ data, error }, clientByProject] = await Promise.all([
      (await getAuthedClient())
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("day")
        .order("start"),
      clientNameByProject(),
    ]);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) =>
      toTask(row, clientByProject.get(row.project_id) ?? ""),
    );
  });

// --- mutations -------------------------------------------------------------------------
// These mirror `taskActions` in src/lib/task-store.ts. The store itself stays: schedule.tsx
// (Track B's file) still drives it, and swapping that over happens at Integration.

export type TaskPatch = Partial<
  Pick<Task, "title" | "workerId" | "day" | "start" | "duration" | "status">
>;

export const updateTask = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; patch: TaskPatch }) => input)
  .handler(async ({ data: { id, patch } }) => {
    const { error } = await (
      await getAuthedClient()
    )
      .from("tasks")
      .update({
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.workerId !== undefined ? { worker_id: patch.workerId } : {}),
        ...(patch.day !== undefined ? { day: patch.day } : {}),
        ...(patch.start !== undefined ? { start: patch.start } : {}),
        ...(patch.duration !== undefined ? { duration: patch.duration } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { id };
  });

export const removeTask = createServerFn({ method: "POST" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { error } = await (
      await getAuthedClient()
    )
      .from("tasks")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { id };
  });

export const addTask = createServerFn({ method: "POST" })
  .inputValidator((input: Omit<Task, "id">) => input)
  .handler(async ({ data: task }) => {
    const id = `t${Date.now()}`;
    const { error } = await (await getAuthedClient()).from("tasks").insert({
      id,
      title: task.title,
      project_id: task.projectId,
      site: task.site,
      worker_id: task.workerId,
      day: task.day,
      start: task.start,
      duration: task.duration,
      kind: task.kind,
      weather_note: task.weatherNote ?? null,
      status: task.status,
    });
    if (error) throw new Error(error.message);
    return { id };
  });
