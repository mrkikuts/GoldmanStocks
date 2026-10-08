# GoldmanStocks Groundcrew

This is the Expo/React Native worker app in the GoldmanStocks monorepo. The GoldmanStocks
TanStack Start website and its existing `/mobile` routes remain at the repository root. This
app has its own dependencies and npm lockfile; do not install its packages into the root project.

## Configure Supabase

Copy `.env.example` to `.env` and use the same Supabase project URL and public anon key configured
for the website (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`). Expo reads the corresponding
`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` variables at build time. The app
uses email OTP, AsyncStorage-backed sessions, and the project's existing `workers`, `projects`,
`plants`, `tasks`, and private `task-photos` storage bucket.

Before signing in:

1. Apply Supabase migrations `0001_init.sql` through `0005_worker_mobile_access.sql` in order.
   Migration `0002` grants no table access on its own; apply `0005` before using either app.
2. Enable email OTP in Supabase Auth.
3. Link each worker's `workers.user_id` to that Auth user's UUID and keep `app_role = 'worker'`.
   The app only lists assigned projects/tasks. The database prevents worker table writes; finishing
   and skipping tasks go through worker-scoped RPCs.

No service-role key or website demo-boss credentials belong in this app. Plant creation with a
plant-specific image remains a manager action because the shared schema only stores task proof
photos; the worker app never stores a plant image as proof for an unrelated task.

## Run

```sh
npm install
npm run start
```

Use the Expo CLI menu to open a device/simulator. For web preview, run `npm run start:web`; for
native development builds use `npm run android` or `npm run ios`.

Run `npm run typecheck` and `npm run lint` from this directory to check the app.
