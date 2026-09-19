# TODO — finishing the integration

Read [HANDOFF.md](HANDOFF.md) first. The list is in priority order, and each item says how to
verify it.

> Updated 19 Sep 2026. Items 1 and 4 are done; the state of 2 and 3 was checked against the live
> database rather than assumed. Anything below that needs the Supabase dashboard, the Vercel
> dashboard or a key rotation cannot be done from a dev machine — those are the ones left.

## 1. Merge `main-test` into `main` (5 min)

The branch is pushed — `main-test` is on GitHub at `91e1137`, so the old "push the branch" item is
done. But it is **not merged**: `main-test` is 7 commits ahead of `main`, and PR #4 merged the
earlier `018239d`, not this work. Confirm with:

```sh
git rev-list --count origin/main..origin/main-test   # 7, plus whatever is added since
```

Open a PR from `main-test` into `main`. Keep the branch green — it syncs to Lovable on push
(`AGENTS.md`), and never force-push or rebase what is already published.

## 2. ~~Fix the live site coordinates~~ — done, except `p3`

Applied to the live database on 19 Sep 2026. `p1` moved from `59.4215, 24.7985` (the forest by the
railway) to `59.4196, 24.8048`; `p2`, `p4` and `p5` likewise. Read back and confirmed.

The script is idempotent and still in the repo — re-running the dry run now reports "already
correct" for all four:

```sh
bun run scripts/fix-site-coordinates.ts            # dry run, prints the before/after
bun run scripts/fix-site-coordinates.ts --apply    # writes
```

**Still to do:** `p3` (Ranna pst 12, Pärnu) has no exact geocode and is untouched at
`58.379, 24.487`. Open `/projects` → **Move sites** and drag its pin onto the building; it saves on
drop. Plants follow their site automatically.

**Verify:** on `/projects/p1` the pin and plant dots sit on the Ülemiste City office park.

## 3. Apply migration 0003 — plant GPS (5 min)

**The file is written**: `supabase/migrations/0003_plant_coordinates.sql`. It has *not* been
applied — the live database still answers `42703: column plants.lat does not exist`.

No code changes are needed either way: `src/lib/supabase/types.ts` already declares `lat`/`lng` as
optional, and `src/lib/api/plants.ts` already retries the write without them on `PGRST204`.

Applying it needs DDL, and PostgREST cannot execute DDL — the REST API exposes no `/rpc/` at all,
so no amount of service-role key helps. Two routes:

- **Dashboard** — paste the file into Supabase → SQL Editor → Run. Always works.
- **psql** — `supabase/README.md` claims the database is unreachable from a dev machine. That looks
  wrong: psql is installed, the pooler resolves over IPv4 and `:5432`/`:6543` are open. The
  reported "doesn't recognise this project's tenant" is what you get connecting as `postgres`
  instead of `postgres.<project-ref>`. Worth one command to find out:

  ```sh
  PGPASSWORD='<db password>' psql \
    "host=aws-0-eu-west-2.pooler.supabase.com port=5432 user=postgres.<project-ref> dbname=postgres sslmode=require" \
    -tAc "select current_user"
  ```

  If that answers, the migration can be applied from the command line and the README needs fixing.

Do item 2 first. Don't backfill existing plants: leaving them `null` is what lets them follow a
moved site.

**Verify:** register a plant from `/mobile/new-plant` with location on; the new row has `lat`/`lng`;
the dot sits where the phone was. If the columns read back empty, run `notify pgrst, 'reload schema';`.

## 4. ~~Build the monthly photo report~~ — done

Built and verified end to end. See [HANDOFF.md](HANDOFF.md) section 7 for how it works.

`/clients` → **Monthly report with photos** now opens `/clients/:clientId/report?month=YYYY-MM`:
one table row per photo uploaded that month, with the picture, date, plant, work done and worker.

Verified by finishing a real job with a photo against the live database — the row appeared with the
right worker, site, time, a signed photo and a map link, adjacent months and other clients stayed
empty — and the test data was removed afterwards (`task_photos` back to 0 rows, `care_events` back
to 120, task `t9` back to `planned`, storage object deleted).

**What is left is real-world use, not code.** `task_photos` is empty, so every client's report is
an empty table until workers start finishing jobs with photos in the worker app. That is the
feature working as designed, not a bug — but it means the report cannot be demoed cold. Finish one
job with a photo on `/mobile` first.

Two limits worth knowing before showing it to anyone, both recorded in HANDOFF.md:

- the **Plant** column is blank for every current task (`tasks.plant_id` is null throughout the
  seed data); the site and zone underneath it locate the work instead
- `clients.hours_this_month` on `/clients` is a static seeded number and does not come from this
  report, so the two will not agree

## 5. Deploy to Vercel (15 min)

Follow [deploy-vercel.md](deploy-vercel.md): import the repo, set the env vars
(`VITE_SUPABASE_*` are needed **at build time**) and deploy. `vercel.json` is already set up.

**Verify:**
- every page loads on the Vercel URL
- the map shows tiles
- "Approve today's plan" shows the AI explanation
- the logo loads
- `/clients/c1/report` renders and prints cleanly

## 6. Security clean-up — now urgent (20 min)

**Rotate everything.** The Supabase `service_role` JWT, the `sb_secret_` key, the anon and
publishable keys, the database password and the OpenAI key have all been pasted into AI chat
transcripts. Rotate in this order:

1. Supabase → Settings → Database → **Reset database password** (the riskiest: unlike the API keys
   it is not scoped by PostgREST).
2. Supabase → Settings → API Keys → rotate `service_role` and `sb_secret_`, and the anon /
   publishable keys in the same pass.
3. OpenAI → API keys → revoke and replace.
4. Update `.env`.
5. Update the env vars in **both** Vercel and Lovable, and redeploy — `VITE_SUPABASE_*` are baked
   in at build time, so saving the setting is not enough.

**Remove the extra auth user:** Supabase → Authentication has a local dev login,
`kristers-local@rootline.demo`. Delete it if nobody uses it.

Nothing in the codebase requires pasting a secret to anyone: `.env` is read directly by `bun`.

## 7. Nice to have

- **Tidy the old docs:** `docs/next-steps.md` predates all of this and its "Known gaps" section is
  out of date. Fold it into these two files or delete it.
- **Fix `supabase/README.md`** if the psql check in item 3 succeeds — it currently tells the next
  person the database is unreachable.
- **One server-function convention:** consolidate `src/lib/api/` and `src/lib/*.functions.ts`.
- **Schedule week view:** stop concurrent jobs of different workers overlapping (split the day
  column per worker).
- **Push reminders:** the "Morning job reminders" switch in the worker app needs push notifications
  before it can work.
- **Demo data:** the shared database has a task titled "Hehe" (`t1789775221396`, Monday, Riga,
  5 h). Rename or delete it before any demo.
- **Tie tasks to plants.** Nothing sets `tasks.plant_id`, which is why the report's Plant column is
  blank. Setting it when a task is created would fill in the report and the plant's care history
  at the same time.
