import { createServerFn } from "@tanstack/react-start";

import type { Client } from "../rootline-data";
import { toClient } from "./mappers";
import { getAuthedClient } from "./session";

/** Replaces the `clients` array in rootline-data.ts. */
export const listClients = createServerFn({ method: "GET" }).handler(
  async (): Promise<Client[]> => {
    const { data, error } = await (
      await getAuthedClient()
    )
      .from("clients")
      .select("*")
      .order("id");
    if (error) throw new Error(error.message);
    return (data ?? []).map(toClient);
  },
);
