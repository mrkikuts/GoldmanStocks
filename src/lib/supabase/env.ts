// Public Supabase config, safe to ship to the browser.
//
// These must be read as literal `import.meta.env.VITE_*` property accesses — Vite
// replaces them statically at build time, so a dynamic lookup like
// `import.meta.env[name]` would come back undefined in the production bundle.

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in from the Supabase dashboard (Project Settings → API).",
  );
}
