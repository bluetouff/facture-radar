import type { APIRoute } from "astro";
import directory from "../../data/official-directory.json";

export const GET: APIRoute = () => new Response(JSON.stringify(directory, null, 2), {
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  },
});
