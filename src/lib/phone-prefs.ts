import { useSyncExternalStore } from "react";

/** Per-phone worker-app preferences, kept in localStorage. */
type Prefs = { geotag: boolean };
const DEFAULTS: Prefs = { geotag: true };
const KEY = "rootline.prefs";

let prefs: Prefs = DEFAULTS;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved)
      prefs = { ...DEFAULTS, ...(JSON.parse(saved) as Partial<Prefs>) };
  } catch {
    // unreadable storage (private mode, blocked site data) — keep the defaults
  }
}

/** Read a preference outside React (e.g. while finishing a job). */
export function getPref<K extends keyof Prefs>(key: K): Prefs[K] {
  hydrate();
  return prefs[key];
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
  hydrate();
  prefs = { ...prefs, [key]: value };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // still applies for this session
  }
  for (const l of listeners) l();
}

export function usePref<K extends keyof Prefs>(key: K): Prefs[K] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      hydrate();
      listener();
      return () => listeners.delete(listener);
    },
    () => prefs[key],
    () => DEFAULTS[key],
  );
}
