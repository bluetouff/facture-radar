import type { APIRoute } from "astro";
import { incidentWatchCorpus } from "../../data/incident-watch.ts";
export const GET: APIRoute = () => new Response(JSON.stringify(incidentWatchCorpus(), null, 2), {
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=3600" },
});
