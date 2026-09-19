/**
 * Corrects the five demo sites' coordinates in the live database (docs/TODO.md, item 2).
 *
 *   bun run scripts/fix-site-coordinates.ts            # dry run — prints what would change
 *   bun run scripts/fix-site-coordinates.ts --apply    # writes
 *
 * The seed file (src/lib/rootline-data.ts) already has the right values; only the live rows are
 * stale, so re-seeding is not the fix — that would wipe the shared database.
 *
 * p3 (Ranna pst 12, Pärnu) is street-level, not building-level: house number 12 has no geocode.
 * The value is the seed file's, corroborated by Nominatim, which puts Ranna pst ~110 m away. It
 * beats the 842 m error it replaces; drag the pin on /projects → Move sites to place it exactly.
 */
import { getAdminClient } from "../src/lib/supabase/server";

const FIXES = [
  { id: "p1", lat: 59.4196, lng: 24.8048, where: "Valukoja 8, Tallinn" },
  { id: "p2", lat: 59.4335, lng: 24.7581, where: "Rävala pst 3, Tallinn" },
  { id: "p3", lat: 58.376, lng: 24.5, where: "Ranna pst, Pärnu (street-level)" },
  { id: "p4", lat: 56.9776, lng: 24.1368, where: "Duntes iela 6, Riga" },
  { id: "p5", lat: 59.4379, lng: 24.7801, where: "Koidula 14, Tallinn" },
] as const;

const apply = process.argv.includes("--apply");
const db = getAdminClient();

const { data: before, error } = await db
  .from("projects")
  .select("id, name, lat, lng")
  .in(
    "id",
    FIXES.map((f) => f.id),
  );
if (error) throw error;

const current = new Map((before ?? []).map((p) => [p.id, p]));

console.log(apply ? "Applying:" : "Dry run — nothing is written:");
for (const fix of FIXES) {
  const now = current.get(fix.id);
  if (!now) {
    console.log(`  ${fix.id}  MISSING from the database`);
    continue;
  }
  const same = now.lat === fix.lat && now.lng === fix.lng;
  console.log(
    `  ${fix.id}  ${now.lat}, ${now.lng}  ->  ${fix.lat}, ${fix.lng}` +
      `  ${same ? "(already correct)" : ""}  ${fix.where}`,
  );
}

if (!apply) {
  console.log("\nRe-run with --apply to write these to the shared database.");
  process.exit(0);
}

for (const fix of FIXES) {
  const { error: updateError } = await db
    .from("projects")
    .update({ lat: fix.lat, lng: fix.lng })
    .eq("id", fix.id);
  if (updateError) throw updateError;
}
console.log(
  "\nDone. Check /projects/p1 — the pin should sit on Ülemiste City.",
);
