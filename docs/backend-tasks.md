# Backend tasks — Rootline

Two people, two tracks, working at the same time. The tracks touch **different files**, so you
should never need to wait on each other or resolve a merge conflict.

- **Stack:** Supabase (Postgres + Auth + Storage), called from TanStack Start server functions.
- **Scope:** hackathon demo — make the five existing screens real. No billing, no multi-tenancy.
- **Where we start from:** the whole app renders hardcoded arrays from `src/lib/rootline-data.ts`,
  and `src/lib/task-store.ts` is an in-memory store that resets on reload. Nothing is persisted yet.

## Ground rules

1. **Do step 0 together first.** It is the only blocking step, ~20 minutes. Nothing else starts
   until the schema commit is on `main` and both of you have pulled it.
2. **Stay in your own files.** Ownership is listed per track below. If you need to change a file the
   other person owns, say so first — don't edit it silently.
3. **Small, frequent merges** off `main`. Never force-push, rebase, amend or squash commits that are
   already pushed — `AGENTS.md` warns this rewrites history on the connected Lovable project.
4. **The schema + types file is a contract.** Changing a column or a type name after step 0 means
   telling the other person immediately; their code is compiling against it.
5. Data stays identical to the mock. Seed straight from `rootline-data.ts` so the demo looks the
   same before and after the backend lands — that makes every regression obvious.

---

## Step 0 — Shared setup (both people, together, ~20 min)

- [ ] **`.gitignore` first.** The repo has none, and it syncs to GitHub + Lovable, so the first
      commit after you create `.env` would publish your keys. Create it with at least:
      `.env*`, `node_modules`, `dist`, `.output`, `.nitro`.
- [ ] Create the Supabase project. Both of you save the project URL, the anon key and the
      service-role key.
- [ ] Create `.env`. **Only public-safe values get the `VITE_` prefix** — `vite.config.ts` injects
      every `VITE_*` var into the client bundle:
      ```
      VITE_SUPABASE_URL=...
      VITE_SUPABASE_ANON_KEY=...
      SUPABASE_SERVICE_ROLE_KEY=...   # server only — no VITE_ prefix
      ANTHROPIC_API_KEY=...           # server only — no VITE_ prefix
      ```
- [ ] `bun add @supabase/supabase-js` (heads up: `bunfig.toml` blocks package versions published in
      the last 24h).
- [ ] **Agree the schema and commit it** as one migration (`supabase/migrations/0001_init.sql`) plus
      one shared types file. Tables:
      `companies`, `clients`, `projects`, `plants`, `workers`, `tasks`, `care_events`,
      `task_photos`, `weather_cache`, `offers`.
      Mirror the field names already in `src/lib/rootline-data.ts` — `PlantStatus`
      (`healthy | attention | critical`), `Task.kind`, `Task.status` (`planned | done | skipped`),
      `Task.weatherNote`, and the plant `x` / `y` percentages that `PlantMap` draws with. Add
      `projects.lat` / `projects.lng` — track B needs real coordinates for the weather lookup.
- [ ] Push it. Both pull. Then split up.

---

## Track A — Data, CRUD & auth

**Owns:** `supabase/`, `src/lib/supabase.ts`, `src/lib/server/clients.ts`, `.../projects.ts`,
`.../plants.ts`, `.../workers.ts`, `.../tasks.ts`, and the routes `plants.tsx`, `clients.tsx`,
`projects.tsx`, `projects.$projectId.tsx`, `workers.tsx`.

- [ ] **A1 — Supabase clients.** `src/lib/supabase.ts`: a browser client (anon key) and a
      server-only client (service-role key). The server one must never be imported from a component.
- [ ] **A2 — Apply the migration** from step 0 to the project; confirm the tables exist in the
      Supabase dashboard.
- [ ] **A3 — Seed script.** Import the arrays from `src/lib/rootline-data.ts` (`clients`,
      `projects`, `plants`, `workers`, `tasks`) and insert them as-is. Make it re-runnable
      (truncate + insert) so you can reset the demo.
- [ ] **A4 — Read + write server functions** with `createServerFn`, one file per entity. Mirror the
      helpers the UI already uses so the swap is mechanical: `getProject`, `projectPlants`,
      `projectTasks`, `projectWorkers` (all in `rootline-data.ts:633-664`). Then port the three
      mutations in `src/lib/task-store.ts` (`update`, `remove`, `add`) to real DB writes.
- [ ] **A5 — Auth.** Supabase Auth with a `boss` / `worker` role on the worker record. Put the
      session in `src/routes/__root.tsx` (the `QueryClientProvider` is already wired there at
      line 134) and redirect unauthenticated users. Keep it simple: email+password is fine for
      the demo.
- [ ] **A6 — Swap your routes to real data.** `useQuery` against A4, drop the `@/lib/rootline-data`
      imports from the five routes you own. `@tanstack/react-query` is already installed and
      configured — nothing to set up.

## Track B — Weather, planner, LLM & photo proof

**Owns:** `src/lib/weather.ts`, `src/lib/planner.ts`, `src/lib/outreach.ts`,
`src/lib/server/weather.ts`, `.../plan.ts`, `.../outreach.ts`, `.../photos.ts`, and the routes
`schedule.tsx`, `index.tsx`.

Write B2 and B3 as **pure functions over the step-0 types**, fed by the mock arrays for now. That
way you never block on track A's tables, and integration is a one-line change of input source.

- [ ] **B1 — Open-Meteo.** Fetch the forecast per site from `projects.lat/lng` (free, no API key).
      Cache responses in `weather_cache` so the demo doesn't hammer the API or die offline.
- [ ] **B2 — Weather rules (pure).** Skip watering after ≥ N mm of rain; pull clipping earlier on a
      warm spell. Output the `weatherNote` string that `Task` already carries and `schedule.tsx`
      already renders (e.g. `"Skipped — 9 mm rain overnight"`).
- [ ] **B3 — Planner (pure).** Assign the day's tasks to workers (respect role and language —
      `workers` has both), then order each worker's route with nearest-neighbor + 2-opt over the
      plant `x` / `y` coordinates.
- [ ] **B4 — LLM.** Server-side only (`ANTHROPIC_API_KEY`, no `VITE_` prefix). Two jobs: a
      plain-language explanation of today's plan behind the "Approve today's plan" button on the
      dashboard, and drafted repeat-work offers behind the revenue card. The boss approves before
      anything is sent — never auto-send.
      ⚠️ Run `/claude-api` before writing this; don't guess model ids or SDK shapes.
- [ ] **B5 — Photo proof.** A Supabase Storage bucket, a signed upload, and a
      `completeTask(taskId, photo, timestamp, gps)` server function writing `task_photos` and
      flipping the task to `done`.
- [ ] **B6 — Wire your routes.** `schedule.tsx` (the week grid and the weather strip) and
      `index.tsx` (weather cards, plan approval, revenue card) against B1–B5.

---

## Integration (both, once the tracks land)

- [ ] Point track B's server functions at track A's tables — drop the remaining `rootline-data`
      imports.
- [ ] Delete `src/lib/task-store.ts`. `rootline-data.ts` survives only as the seed source for A3.
- [ ] `bun run lint` clean, `bun run dev` clean.
- [ ] Walk the demo script in `docs/goldmanStocks.md` → "Hackathon demo", end to end:
      rain skips watering → boss approves the plan → worker completes a task with a photo →
      revenue card shows drafted offers.
