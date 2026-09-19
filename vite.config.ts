// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

// Lovable-hosted assets (the logo) live under /__l5e/. Its dev proxy only forwards them when
// LOVABLE_PREVIEW_HOST is in process.env, which Lovable's sandbox sets but a local `bun run dev`
// doesn't — so read it from .env here, leaving Lovable's own value alone.
const previewHost = loadEnv("development", process.cwd(), "LOVABLE_")[
  "LOVABLE_PREVIEW_HOST"
];
if (previewHost && !process.env["LOVABLE_PREVIEW_HOST"]) {
  process.env["LOVABLE_PREVIEW_HOST"] = previewHost;
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
