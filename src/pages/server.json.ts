import type { APIRoute } from "astro";
import registryMetadata from "../../server.json" with { type: "json" };

export const GET: APIRoute = () => new Response(JSON.stringify(registryMetadata, null, 2), {
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  },
});
