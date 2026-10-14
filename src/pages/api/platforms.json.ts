import type { APIRoute } from "astro";
import sources from "../../data/sources.json";
import { platforms } from "../../data/platforms";
import { platformResearchProfiles } from "../../data/platform-research";
import { publicSiteObservations, TRACKER_RADAR_REVISION } from "../../data/public-site-observations";
import { MCP_CORPUS_CHECKED_AT } from "../../mcp/corpus";

export const GET: APIRoute = () => new Response(JSON.stringify({
  schemaVersion: "0.3.0",
  generatedAt: MCP_CORPUS_CHECKED_AT,
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
