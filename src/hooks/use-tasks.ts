import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import {
  addTask,
  listTasks,
  removeTask,
  replaceTasks,
  updateTask,
  type TaskPatch,
} from "@/lib/api/tasks";
import type { Task } from "@/lib/types";

const TASKS_KEY = ["tasks"] as const;

/**
 * The week's tasks, from the database.
 *
 * Replaces the in-memory store that used to live in src/lib/task-store.ts, where every edit was
 * lost on reload — which showed up as the boss's approved plan quietly resetting itself.
 */
export function useTasks(): Task[] {
  const { data } = useQuery({
    queryKey: TASKS_KEY,
    queryFn: () => listTasks(),
  });
  return data ?? [];
}

/**
 * Task mutations, mirroring the old `taskActions` object so call sites only had to move from a
 * module import to a hook call. Each one refetches the list, so every view stays in step.
 */
export function useTaskActions() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: TASKS_KEY });
  };

  const update = useMutation({
    mutationFn: (input: { id: string; patch: TaskPatch }) =>
      updateTask({ data: input }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => removeTask({ data: id }),
    onSuccess: invalidate,
  });
  const add = useMutation({
    mutationFn: (task: Omit<Task, "id">) => addTask({ data: task }),
    onSuccess: invalidate,
  });
  const replace = useMutation({
    mutationFn: (tasks: Task[]) => replaceTasks({ data: tasks }),
    onSuccess: invalidate,
  });

  return useMemo(
    () => ({
      update: (id: string, patch: TaskPatch) => update.mutate({ id, patch }),
      remove: (id: string) => remove.mutate(id),
      add: (task: Omit<Task, "id">) => add.mutate(task),
      replace: (tasks: Task[]) => replace.mutate(tasks),
    }),
    [update, remove, add, replace],
  );
}
