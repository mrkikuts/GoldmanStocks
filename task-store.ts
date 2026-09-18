import { useSyncExternalStore } from "react";

import { tasks as initialTasks, type Task } from "./rootline-data";

let state: Task[] = initialTasks.map((t) => ({ ...t }));
const listeners = new Set<() => void>();

function emit() {
  state = [...state];
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot() {
  return state;
}

export function useTasks() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export const taskActions = {
  update(id: string, patch: Partial<Task>) {
    state = state.map((t) => (t.id === id ? { ...t, ...patch } : t));
    emit();
  },
  remove(id: string) {
    state = state.filter((t) => t.id !== id);
    emit();
  },
  add(task: Omit<Task, "id">) {
    state = [...state, { ...task, id: `t${Date.now()}` }];
    emit();
  },
};
