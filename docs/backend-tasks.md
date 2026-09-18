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

- [x] **`.gitignore` first.** The repo has none, and it syncs to GitHub + Lovable, so the first
      commit after you create `.env` would publish your keys. Create it with at least:
      `.env*`, `node_modules`, `dist`, `.output`, `.nitro`.
- [x] Create the Supabase project. Both of you save the project URL, the anon key and the
      service-role key.
- [x] Create `.env`. **Only public-safe values get the `VITE_` prefix** — `vite.config.ts` injects
      every `VITE_*` var into the client bundle:
      ```
      VITE_SUPABASE_URL=...
      VITE_SUPABASE_ANON_KEY=...
      SUPABASE_SERVICE_ROLE_KEY=...   # server only — no VITE_ prefix
      ANTHROPIC_API_KEY=...           # server only — no VITE_ prefix
      ```
- [x] `bun add @supabase/supabase-js @supabase/ssr` (heads up: `bunfig.toml` blocks package versions
      published in the last 24h). `@supabase/ssr` is what keeps the session in cookies so server
      functions can see the logged-in user. Note: nothing was installed on this machine — if `bun`
      is missing for you too, `brew install bun`, then `bun install`.
- [x] **Schema — already live, applied straight to the project.** It was created in the dashboard
      rather than through `supabase/migrations/`, so there is no init migration in the repo (an
      init file that didn't match the live database would be worse than none — applying it would
      clobber the real schema).

      **The contract is `src/lib/supabase/types.ts`**, generated from the live schema; see
      `supabase/README.md` for how to regenerate it (`supabase gen types` needs Docker, so it's
      done by reading PostgREST's OpenAPI spec instead). **Read the types file before writing
      queries — the columns are not what an earlier draft of this doc described.**

      What Track B needs to know:
      - `weather_cache` is a **generic cache**: `key` (text, PK), `fetched_at`, `payload` (jsonb).
        Not one row per site per day — you choose the key format and what goes in the payload.
      - `projects.lat` / `lng` exist, are **NOT NULL**, and are seeded with real coordinates for
        all five sites. Open-Meteo can be called straight off them.
      - `tasks` has `day` (0 = Monday), `start` (hour) and `duration` (hours) — the same shape as
        the `Task` type in `rootline-data.ts`. There is **no** `scheduled_date` and **no**
        `route_order`; derive the date from `day` off the demo week start (21 Sep 2026), and keep
        route order in your own structure or ask for a column.
      - `offers` carries `subject`, `body` and `due_date` alongside `what` / `value`, so B4's
        drafted messages have somewhere to live. Seeded with placeholder drafts.
      - `task_photos` is ready for B5: `task_id`, `storage_path`, `taken_at`, `lat`, `lng`.
      - `care_events` uses `date` (not `event_date`) and has no photo flag.
      - There is **no denormalised `client` column** on `projects`, `plants` or `tasks`. The A4
        mappers join through `clients` to fill the `client` field the UI expects — reuse
        `clientNameByProject()` in `src/lib/server/lookups.ts` rather than re-deriving it.
      - **RLS is on and it denied everyone.** No policy admitted the `authenticated` role, so even
        a correctly signed-in user read zero rows from every table. Fixed additively by
        `supabase/migrations/0002_authenticated_access.sql` (run it in the dashboard SQL editor —
        API keys can't execute DDL). Existing policies are untouched; `using (true)` still needs
        tightening to per-company scoping before real data goes near it.
      - Query through `getAuthedClient()` in `src/lib/server/session.ts`, not `getServerClient()`
        directly — it signs in and memoises one authenticated client per request.
- [ ] Push it. Both pull. Then split up.

---

## Track A — Data, CRUD & auth

**Owns:** `supabase/`, `src/lib/supabase/`, `src/lib/server/clients.ts`, `.../projects.ts`,
`.../plants.ts`, `.../workers.ts`, `.../tasks.ts`, and the routes `plants.tsx`, `clients.tsx`,
`projects.tsx`, `projects.$projectId.tsx`, `workers.tsx`.

- [x] **A1 — Supabase clients.** Done, as a folder rather than one file. **Track B imports from
      here**, so use these exact paths:
      - `@/lib/supabase/client` → `supabase`, the browser client (anon key, RLS applies).
      - `@/lib/supabase/server` → `getServerClient()` for anything acting on behalf of a user
        (request-scoped, reads the session from cookies, RLS applies) and `getAdminClient()` for
        trusted server work only (service-role, **bypasses RLS**). Call these per request — never
        hoist the result to module scope, or one request's session leaks into another's response.
      - `@/lib/supabase/types` → `Database`. A2 overwrites this file with generated types.
      `server.ts` starts with `import "@tanstack/react-start/server-only"`, so importing it from a
      component fails the build instead of leaking the service-role key into the bundle.
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
