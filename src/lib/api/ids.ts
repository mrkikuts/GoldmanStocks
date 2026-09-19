import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../supabase/types";

type Db = SupabaseClient<Database>;
type IdTable = "clients" | "workers" | "projects" | "plants";

/**
 * The next id in a table's existing scheme — c6 after c5, PL-0462 after PL-0461 — so new
 * records look like the seeded ones. `pad` zero-pads the number (plants use 4 digits).
 */
export async function nextId(
  db: Db,
  table: IdTable,
  prefix: string,
  pad = 0,
): Promise<string> {
  const { data, error } = await db
    .from(table)
    .select("id")
    .like("id", `${prefix}%`);
  if (error) throw new Error(error.message);
  const numbers = (data ?? [])
    .map((row) => Number(row.id.slice(prefix.length)))
    .filter(Number.isFinite);
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `${prefix}${String(next).padStart(pad, "0")}`;
}

/** The company every record belongs to (single-tenant for now). */
export async function companyId(db: Db): Promise<string> {
  const { data, error } = await db
    .from("companies")
    .select("id")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No company found — run the seed first.");
  return data.id;
}

/** Keep a client's site/plant counters in step when records are added under it. */
export async function bumpClientCounter(
  db: Db,
  clientId: string,
  field: "sites" | "plants",
) {
  const { data, error } = await db
    .from("clients")
    .select("sites, plants")
    .eq("id", clientId)
    .single();
  if (error) throw new Error(error.message);
  const next = (data[field] ?? 0) + 1;
  const { error: updateError } = await db
    .from("clients")
    .update(field === "sites" ? { sites: next } : { plants: next })
    .eq("id", clientId);
  if (updateError) throw new Error(updateError.message);
}
