import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://pa.l0g.fr",
  output: "static",
  build: { format: "directory" },
  security: { checkOrigin: true },
});
