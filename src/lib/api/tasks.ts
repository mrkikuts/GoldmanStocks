import { createServerFn } from "@tanstack/react-start";

import type { Task } from "../types";
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
  .validator((projectId: string) => projectId)
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
// These back `useTaskActions()` in src/hooks/use-tasks.ts, which replaced the in-memory
// src/lib/task-store.ts. Call them through that hook rather than directly, so the cached
// task list is refetched and every open view stays in step.

export type TaskPatch = Partial<
  Pick<
    Task,
    | "title"
    | "workerId"
    | "day"
    | "start"
    | "duration"
    | "status"
    | "site"
    | "kind"
    | "weatherNote"
    | "plantId"
    | "approvedAt"
  >
>;

/** TaskPatch -> column names, in one place so update and replace can't drift apart. */
function toRow(patch: TaskPatch) {
  return {
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.workerId !== undefined ? { worker_id: patch.workerId } : {}),
    ...(patch.day !== undefined ? { day: patch.day } : {}),
    ...(patch.start !== undefined ? { start: patch.start } : {}),
    ...(patch.duration !== undefined ? { duration: patch.duration } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.site !== undefined ? { site: patch.site } : {}),
    ...(patch.kind !== undefined ? { kind: patch.kind } : {}),
    ...(patch.weatherNote !== undefined
      ? { weather_note: patch.weatherNote }
      : {}),
    ...(patch.plantId !== undefined ? { plant_id: patch.plantId } : {}),
    ...(patch.approvedAt !== undefined
      ? { approved_at: patch.approvedAt }
      : {}),
  };
}

export const updateTask = createServerFn({ method: "POST" })
  .validator((input: { id: string; patch: TaskPatch }) => input)
  .handler(async ({ data: { id, patch } }) => {
    const { error } = await (
      await getAuthedClient()
    )
      .from("tasks")
      .update(toRow(patch))
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { id };
  });

/**
 * Write a whole set of tasks at once — what "approve today's plan" and the schedule's plan
 * generation do. One upsert rather than a request per task, so a twelve-task plan is a single
 * round trip and cannot half-apply.
 */
export const replaceTasks = createServerFn({ method: "POST" })
  .validator((tasks: Task[]) => tasks)
  .handler(async ({ data: tasks }) => {
    if (tasks.length === 0) return { count: 0 };
    const { error } = await (await getAuthedClient()).from("tasks").upsert(
      tasks.map((task) => ({
        id: task.id,
        project_id: task.projectId,
        site: task.site,
        worker_id: task.workerId,
        title: task.title,
        day: task.day,
        start: task.start,
        duration: task.duration,
        kind: task.kind,
        weather_note: task.weatherNote ?? null,
        status: task.status,
        plant_id: task.plantId ?? null,
        approved_at: task.approvedAt ?? null,
      })),
    );
    if (error) throw new Error(error.message);
    return { count: tasks.length };
  });

export const removeTask = createServerFn({ method: "POST" })
  .validator((id: string) => id)
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
  .validator((input: Omit<Task, "id">) => input)
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
      plant_id: task.plantId ?? null,
    });
    if (error) throw new Error(error.message);
    return { id };
  });
