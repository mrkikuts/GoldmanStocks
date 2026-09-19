// Public Supabase config, safe to ship to the browser.
//
// These must be read as literal `import.meta.env.VITE_*` property accesses — Vite
// replaces them statically at build time, so a dynamic lookup like
// `import.meta.env[name]` would come back undefined in the production bundle.

// The check lives inside the initializer rather than as a bare top-level `if (...) throw`.
// `sideEffects: false` in package.json lets the bundler drop a module's top-level statements,
// which silently turned a missing key into `createBrowserClient(undefined, undefined)` and an
// opaque Supabase error at runtime. A throw in the initializer of a binding someone imports
// cannot be dropped. See also the build-time guard in vite.config.ts.
function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Locally, copy .env.example to .env and fill it in from the Supabase dashboard (Project Settings → API). On Vercel, set it under Project Settings → Environment Variables — Vite inlines VITE_* values when the build runs, so it must be set there before deploying.`,
    );
  }
  return value;
}

export const SUPABASE_URL = required(
  import.meta.env.VITE_SUPABASE_URL,
  "VITE_SUPABASE_URL",
);
export const SUPABASE_ANON_KEY = required(
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  "VITE_SUPABASE_ANON_KEY",
);
