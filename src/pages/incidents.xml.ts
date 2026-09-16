import type { APIRoute } from "astro";
import { platformIncidents } from "../data/incident-watch";
import { renderIncidentRss } from "../lib/incident-rss";

export const GET: APIRoute = () => new Response(renderIncidentRss(platformIncidents), {
  headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
});
