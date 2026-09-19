import { useMemo, useSyncExternalStore } from "react";

import { useProjects, useWorkers } from "@/hooks/use-data";
import type { Project, Worker } from "@/lib/types";

/**
 * Which worker is using this phone — remembered in localStorage, validated against the
 * worker list from the database (an id that no longer exists falls back to the first worker).
 */
const STORAGE_KEY = "rootline.worker";

let currentId = "";
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved && saved !== currentId) {
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
  if (typeof window !== "undefined")
    window.localStorage.setItem(STORAGE_KEY, id);
  emit();
}

function getSnapshot() {
  return currentId;
}

/** The worker signed in on this phone — undefined only while the worker list loads. */
export function useActiveWorker(): Worker | undefined {
  const id = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const workers = useWorkers();
  return workers.find((w) => w.id === id) ?? workers[0];
}

/** Sites the given worker is on, as crew or lead. */
export function useWorkerProjects(workerId: string | undefined): Project[] {
  const projects = useProjects();
  return useMemo(
    () =>
      workerId
        ? projects.filter(
            (p) =>
              p.workerIds.includes(workerId) || p.leadWorkerId === workerId,
          )
        : [],
    [projects, workerId],
  );
}
