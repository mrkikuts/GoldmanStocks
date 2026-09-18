import { createServerFn } from "@tanstack/react-start";

import type { Worker } from "../rootline-data";
import { toWorker } from "./mappers";
import { getAuthedClient } from "./session";

/** Replaces the `workers` array in rootline-data.ts. */
export const listWorkers = createServerFn({ method: "GET" }).handler(
  async (): Promise<Worker[]> => {
    const { data, error } = await (
      await getAuthedClient()
    )
      .from("workers")
      .select("*")
      .order("id");
    if (error) throw new Error(error.message);
    return (data ?? []).map(toWorker);
  },
);
