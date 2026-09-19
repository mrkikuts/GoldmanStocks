# Next steps — Goldman Stocks

Written 19 Sep 2026, with the demo week starting 21 Sep. Everything below is demo-focused.

## Where things stand

The backend is real and hosted. **Supabase** holds the data, the auth session and the proof
photos — none of that is local. Only the frontend runs on your machine, at
`http://localhost:8080` (`bun run dev`).

| Piece | State |
| --- | --- |
| Database, auth, storage | Hosted Supabase, seeded, RLS on |
| Clients / workers / plants / projects / project detail | Live from the database |
| Task changes (edit, approve, complete) | Persist — survive a reload |
| Photo proof | Real: signed upload → storage → `task_photos` row → task done |
| Weather on the dashboard | Live Open-Meteo, cached in `weather_cache` |
| Plan explanation and drafted offers | OpenAI (`gpt-4o`, override with `OPENAI_MODEL`) |
| Dashboard/schedule/mobile *entity* lists | Still the mock arrays — see Known gaps |
| Hosted URL | Not set up — needs env vars in Lovable |

## Before the demo, in order

### 1. Click through it yourself

This is the one thing that has never been verified in a browser. Everything else was checked
against the database and the dev server, but Claude has no browser in this session, and one bug
(a client importing a server module) got past HTTP checks precisely because it only shows up in
the browser. Worth ten minutes:

- `/schedule` — change a task's time or worker, reload. It should stick.
- `/` — approve the day's plan, reload. The approval should stick, and the explanation comes back
  from OpenAI.
- `/mobile` — tap the camera on a job, pick any photo. Expect "Uploading photo…" then "Photo saved
  — job marked done", surviving a reload. On failure the job deliberately stays **open** rather
  than claiming work with no evidence.
- Open `/mobile` on a phone via the network URL `vite dev` prints, on the same Wi-Fi.

### 2. Walk the demo script

`docs/goldmanStocks.md` → "Hackathon demo". Honest mapping:

| Script beat | Reality |
| --- | --- |
| 1. Boss opens the app, plants by status, rain skipped watering | Works. Weather is genuinely live; the plant/client numbers are still mock |
| 2. AI plan for the crew, boss approves | Works, and the approval now persists |
| 3a. Worker completes a job with a photo | Works end to end — real upload, real proof row |
| 3b. Worker photographs a new shrub, it's recognised and pinned | **Stand-in only.** `mobile.new-plant.tsx` fakes recognition and saves nothing |
| 4. Revenue card → drafted offers → approve | Works. Drafts come from OpenAI; nothing is ever sent |

Rehearse 3b or cut it — it is the one beat that would not survive a follow-up question.

### 3. Rotate the exposed credentials

The Supabase service-role key, the database password and the OpenAI key were all pasted into a
chat transcript. Rotate them in the Supabase and OpenAI dashboards, then update `.env`. The
service-role key is the urgent one: it bypasses row-level security completely.

## Known gaps

**Mock entity data.** These files still import the arrays from `src/lib/rootline-data.ts`:

`routes/index.tsx`, `hooks/use-week-plan.ts`, `lib/weather.functions.ts`, `lib/worker-store.ts`,
`routes/schedule.tsx`, and `routes/mobile.{index,plants,locations,settings}.tsx`.

Mostly invisible, because the database was seeded *from* those arrays — same names, same numbers.
Two places where it does matter:

- `mobile.index.tsx` renders the **mock `weather` array**, so the phone's weather strip is fake
  while the dashboard's is live. They can disagree on stage.
- `weather.functions.ts` reads coordinates from mock `projects`. Same values as the seeded rows
  today, so the forecast is right — but it breaks the moment a site is added or moved.

Finishing this is the remaining Integration work in `docs/backend-tasks.md`. It is not required
for the demo.

**Two server-function conventions.** Track B uses `src/lib/*.functions.ts` with implementations in
`src/lib/server/`; Track A uses `src/lib/api/`. Both work. Worth consolidating after the demo, not
before.

**Never put a client import inside `src/lib/server/`.** TanStack denies anything under a `server/`
directory in the browser, and it fails *only* in the browser — SSR renders fine and every route
answers 200. To check: with the dev server running, request each client module and grep for
`import-protection`:

```sh
for f in $(find src/routes src/hooks src/components -name "*.ts*" | grep -v /ui/); do
  curl -s "http://localhost:8080/$f" | grep -q import-protection && echo "DENIED: $f"
done
```

Requesting a `src/lib/server/*` module directly will report denied — that is expected. The signal
is a *client entry point* being denied, or an `Importer:` line naming one.

## If you want a hosted URL

The production build works — `bun run build` produces a Cloudflare Worker with `nodejs_compat`,
and no server secret ends up in the client bundle. The only blocker is configuration.

In Lovable's environment settings, add:

```
VITE_SUPABASE_URL            # public
VITE_SUPABASE_ANON_KEY       # public
SUPABASE_SERVICE_ROLE_KEY    # secret — no VITE_ prefix
OPENAI_API_KEY               # secret — no VITE_ prefix
OPENAI_MODEL                 # optional, defaults to gpt-4o
DEMO_BOSS_EMAIL              # secret — no VITE_ prefix
DEMO_BOSS_PASSWORD           # secret — no VITE_ prefix
```

Two things to get right:

- **The `VITE_` pair is needed at build time**, not just runtime — Vite inlines those values into
  the client bundle when it builds. The rest are read at runtime from `process.env`.
- **Never give a secret a `VITE_` prefix.** Anything prefixed is compiled into the browser bundle,
  and the service-role key bypasses RLS entirely.

Without these, every page on the deployed URL returns 500: `src/lib/supabase/env.ts` throws on a
missing variable, and every route's loader reaches it.

Presenting from `localhost:8080` works today and has no deploy step to fail on stage.

## Commands

```sh
bun run dev     # http://localhost:8080
bun run seed    # wipe and reload the demo data, including the boss account
bun test        # 62 tests
bun run build   # production build (Cloudflare Worker)
bunx tsc --noEmit
```

`bun run lint` is red across the shadcn components and has been since before any of this work —
pre-existing formatting, not a regression. Files touched by the backend work are clean.
