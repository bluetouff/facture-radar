import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://facture.l0g.fr",
  output: "static",
  build: { format: "directory" },
  security: { checkOrigin: true },
});
