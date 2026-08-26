import type { APIRoute } from "astro";
import { corpusResources } from "../../mcp/corpus.ts";

const resources = corpusResources({
  revision: "https://pa.l0g.fr/DEPLOYED_SHA",
  builtAt: "https://pa.l0g.fr/DEPLOYED_SHA",
});

export const GET: APIRoute = () => new Response(JSON.stringify({
  ...resources,
  revisionUrl: "https://pa.l0g.fr/DEPLOYED_SHA",
}, null, 2), {
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  },
});
