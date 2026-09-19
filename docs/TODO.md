# TODO — finishing the integration

Read [HANDOFF.md](HANDOFF.md) first. The list is in priority order, and each item says how to verify it.

## 1. Push the branch (2 min)

`main-test` has 6 local commits that aren't on GitHub yet (`7cc7f15` … `a5675ff`). Push them with
GitHub Desktop → Push origin, or `git push origin main-test`.

## 2. Fix the live site coordinates (5 min)

The five demo sites in the database still have rough coordinates. On the real map, Ülemiste
(Valukoja 8) sits in a forest by the railway. The seed file (`src/lib/rootline-data.ts`) is
already fixed; the live database isn't. Run this in Supabase → SQL Editor:

```sql
update projects set lat = 59.4196, lng = 24.8048 where id = 'p1'; -- Valukoja 8, Tallinn
update projects set lat = 59.4335, lng = 24.7581 where id = 'p2'; -- Rävala pst 3, Tallinn
update projects set lat = 56.9776, lng = 24.1368 where id = 'p4'; -- Duntes iela 6, Riga
update projects set lat = 59.4379, lng = 24.7801 where id = 'p5'; -- Koidula 14, Tallinn
```

For `p3` (Ranna pst 12, Pärnu), the geocoder found no exact match. Open `/projects` → **Move sites**
and drag its pin onto the building. Plants follow their site automatically (see item 3).

**Verify:** on `/projects/p1` the pin and plant dots sit on the Ülemiste City office park.

## 3. Write and apply migration 0003 — plant GPS (10 min)

Until this runs, a plant registered from a phone gets a position *on the site plan*. Its exact GPS
point is thrown away, and GPS outside the 160 × 100 m plan is clamped to the edge. The code
already reads and writes these columns once they exist; nothing else needs to change.

Create `supabase/migrations/0003_plant_coordinates.sql`:

```sql
-- 0003_plant_coordinates.sql — real GPS positions for plants and areas.
-- Nullable on purpose: plants without them are drawn from their site-plan x/y around the site
-- (src/lib/geo.ts), so they keep following the site if it's moved on the map.
alter table plants
  add column if not exists lat double precision,
  add column if not exists lng double precision;
```

Apply it: paste it into Supabase → SQL Editor → Run. Do item 2 first. Don't backfill existing
plants: leaving them `null` is what lets them follow a moved site.

**Verify:**
- register a plant from `/mobile/new-plant` with location on
- the new row in `plants` has `lat`/`lng` set
- the dot sits exactly where the phone was

If the columns stay empty, PostgREST may still have the old schema cached. Run
`notify pgrst, 'reload schema';`.

## 4. Build the monthly photo report (½–1 day) — the one unfinished feature

On `/clients`, **"Monthly report with photos" is still a fake toast.** All the data exists:
`task_photos` (proof photos with time and GPS), `tasks`, `care_events`, `plants`, `projects`.

Suggested build, following the conventions in HANDOFF.md:

1. **Server logic**, in `src/lib/server/reports.ts`: `clientReport(db, { clientId, month: "YYYY-MM" })`
   - the client and its sites (`projects.client_id`)
   - the proof photos taken that month: `task_photos` joined to `tasks` for those sites,
     `taken_at` within the month. Sign the image URLs in one go with
     `storage.from("task-photos").createSignedUrls(paths, 3600)`.
   - the care done that month: `care_events` with `done = true` and a `date` in the month, for plants
     on those sites
   - worker names for both lists
   - totals: jobs proven with a photo, hours (sum of those tasks' `duration`), care actions,
     plants cared for
2. **Server function**, in `src/lib/reports.functions.ts`. Use the service-role client, imported inside the handler (see
   `src/lib/photos.functions.ts`), because signing storage URLs needs it.
3. **Route:** `src/routes/clients_.$clientId.report.tsx`. Keep the trailing `_`: `clients.tsx` has no
   `<Outlet>`. Read the month from a search param (`validateSearch`, default this month). Lay the
   page out as totals, then one section per site with a photo grid (date, job, worker, a map link from
   the GPS), then a care log table. Add a **Print** button (`window.print()`) and hide the sidebar
   when printing (`print:hidden`).
4. **Button:** replace the toast in `src/routes/clients.tsx` with a `<Link>` to the report.

**Verify:**
- finish a job with a photo on `/mobile`
- open that client's report for this month: the photo, the job and the worker appear, and the print
  preview is clean
- clean up the test photo afterwards: the `task_photos` row and the storage object, and set the task
  back to `planned`

`task_photos` is empty right now, so reports will only show care events until real jobs are
finished with photos.

## 5. Deploy to Vercel (15 min)

Follow [deploy-vercel.md](deploy-vercel.md): import the repo, set the env vars
(`VITE_SUPABASE_*` are needed **at build time**) and deploy. `vercel.json` is already set up.

**Verify:**
- every page loads on the Vercel URL
- the map shows tiles
- "Approve today's plan" shows the AI explanation
- the logo loads

## 6. Security clean-up (10 min)

- **Rotate** the Supabase service-role key, the database password and the OpenAI key. They were
  pasted into an AI chat transcript. Update `.env` and the Vercel/Lovable settings afterwards.
- **Remove the extra auth user:** Supabase → Authentication has a local dev login, `kristers-local@rootline.demo`,
  created so one machine could run the app. Delete it if nobody uses it.

## 7. Nice to have

- **Tidy the old docs:** refresh `docs/next-steps.md` or fold it into these files. Its "Known gaps" section is out of date.
- **One server-function convention:** consolidate `src/lib/api/` and `src/lib/*.functions.ts`.
- **Schedule week view:** stop concurrent jobs of different workers overlapping (split the day column per
  worker).
- **Push reminders:** the "Morning job reminders" switch in the worker app needs push notifications before
  it can work.
- **Demo data:** the shared database has a task literally titled "Hehe" (Monday, Riga). Rename or delete
  it before any demo.
