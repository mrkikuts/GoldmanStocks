/// <reference types="vite/client" />

// Typed so `import.meta.env.VITE_SUPABASE_URL` is a string rather than an index-signature
// lookup — `noPropertyAccessFromIndexSignature` in tsconfig.json rejects the latter.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
