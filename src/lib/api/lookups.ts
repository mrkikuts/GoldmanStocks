import { getAuthedClient } from "./session";

/**
 * project id -> client name. The live schema drops the denormalised `client` column the UI
 * expects, so we resolve it here. Five clients and five projects: cheaper to join in memory
 * than to thread PostgREST embeds through every query.
 */
export async function clientNameByProject(): Promise<Map<string, string>> {
  const db = await getAuthedClient();
  const [{ data: projects, error: pErr }, { data: clients, error: cErr }] =
    await Promise.all([
      db.from("projects").select("id, client_id"),
      db.from("clients").select("id, name"),
    ]);
  if (pErr) throw new Error(pErr.message);
  if (cErr) throw new Error(cErr.message);

  const nameByClient = new Map((clients ?? []).map((c) => [c.id, c.name]));
  return new Map(
    (projects ?? []).map(
      (p) => [p.id, nameByClient.get(p.client_id) ?? ""] as const,
    ),
  );
}

export async function clientNameById(): Promise<Map<string, string>> {
  const db = await getAuthedClient();
  const { data, error } = await db.from("clients").select("id, name");
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((c) => [c.id, c.name]));
}
