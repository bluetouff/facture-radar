import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://pa.l0g.fr",
  output: "static",
  build: { format: "directory" },
  // Keep fonts as same-origin files for the production font-src 'self' policy.
  vite: { build: { assetsInlineLimit: 0 } },
  security: { checkOrigin: true },
});
