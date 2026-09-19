import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import type { Client } from "../types";
import { toClient } from "./mappers";
import { companyId, nextId } from "./ids";
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

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const ClientInput = z.object({
  /** omit to create a new client */
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required"),
  city: z.string().trim().min(1, "City is required"),
  contact: z.string().trim(),
  monthlyValue: z.number().min(0),
  contractUntil: isoDate.or(z.literal("")),
  health: z.enum(["good", "watch", "at risk"]),
});
export type ClientInput = z.infer<typeof ClientInput>;

/** Create or update a client. New clients start with no sites or plants. */
export const saveClient = createServerFn({ method: "POST" })
  .validator(ClientInput)
  .handler(async ({ data }): Promise<{ id: string }> => {
    const db = await getAuthedClient();
    const row = {
      name: data.name,
      city: data.city,
      contact: data.contact,
      monthly_value: data.monthlyValue,
      contract_until: data.contractUntil || null,
      health: data.health,
    };
    if (data.id) {
      const { error } = await db.from("clients").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const id = await nextId(db, "clients", "c");
    const { error } = await db
      .from("clients")
      .insert({ ...row, id, company_id: await companyId(db) });
    if (error) throw new Error(error.message);
    return { id };
  });
