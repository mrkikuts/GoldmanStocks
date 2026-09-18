import { createBrowserClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";
import type { Database } from "./types";

/**
 * Browser-side Supabase client, scoped by the anon key and row-level security.
 *
 * `createBrowserClient` keeps the session in cookies rather than localStorage, which is
 * what lets server functions see who is logged in — see `getServerClient` in ./server.ts.
 */
export const supabase = createBrowserClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);
