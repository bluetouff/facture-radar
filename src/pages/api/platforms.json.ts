import type { APIRoute } from "astro";
import sources from "../../data/sources.json";
import { platforms } from "../../data/platforms";
import { platformResearchProfiles } from "../../data/platform-research";
import { publicSiteObservations, TRACKER_RADAR_REVISION } from "../../data/public-site-observations";

export const GET: APIRoute = () => new Response(JSON.stringify({
  schemaVersion: "0.2.0",
  generatedAt: "2026-08-27",
  methodology: "https://pa.l0g.fr/methodologie/",
  platforms,
  research: platformResearchProfiles,
  publicSiteObservations,
  trackerRadarRevision: TRACKER_RADAR_REVISION,
  sources,
}, null, 2), {
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  },
});
