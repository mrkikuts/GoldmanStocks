import { useSyncExternalStore } from "react";

import { projects, workers, type Worker } from "@/lib/rootline-data";

const STORAGE_KEY = "rootline.worker";

let currentId: string = workers[0]?.id ?? "";
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved && workers.some((w) => w.id === saved) && saved !== currentId) {
    currentId = saved;
    // Runs after hydration, so a re-render here is safe.
    emit();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  hydrate();
  return () => {
    listeners.delete(listener);
  };
}

export function setActiveWorker(id: string) {
  if (currentId === id) return;
  currentId = id;
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, id);
  emit();
}

function getSnapshot() {
  return currentId;
}

/** The worker signed in on this phone. */
export function useActiveWorker(): Worker {
  const id = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return workers.find((w) => w.id === id) ?? (workers[0] as Worker);
}

/** Projects the given worker is assigned to. */
export function workerProjects(workerId: string) {
  return projects.filter((p) => p.workerIds.includes(workerId) || p.leadWorkerId === workerId);
}
