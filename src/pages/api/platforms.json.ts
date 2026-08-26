import type { APIRoute } from "astro";
import sources from "../../data/sources.json";
import { platforms } from "../../data/platforms";

export const GET: APIRoute = () => new Response(JSON.stringify({
  schemaVersion: "0.1.0",
  generatedAt: "2026-08-26",
  methodology: "https://pa.l0g.fr/methodologie/",
  platforms,
  sources,
}, null, 2), {
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  },
});
