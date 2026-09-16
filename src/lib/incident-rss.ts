import type { PlatformIncident } from "../data/incident-watch.ts";
import { incidentScopeLabels, incidentStatusLabels, incidentVerificationLabels } from "../data/incident-watch.ts";
import { isDateOnly, formatIncidentDate } from "./incident-dates.ts";
import sources from "../data/sources.json" with { type: "json" };

const escapeXml = (value: string) => value.replace(/[<>&"']/g, character => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]!);
export function renderIncidentRss(events: readonly PlatformIncident[]) {
  const items = events.map(event => {
    const sourceUrls = [...event.sourceIds, ...(event.relationship?.sourceIds ?? [])]
      .map(id => sources.find(source => source.id === id)!.url);
    const description = [
      event.summary,
      `Qualification : ${incidentVerificationLabels[event.verification]}. État : ${incidentStatusLabels[event.status]}. Périmètre : ${incidentScopeLabels[event.scope]}.`,
      event.affectedService ? `Service : ${event.affectedService}.` : "",
      event.relationship?.note ?? "",
      event.limitations,
      `Publication : ${formatIncidentDate(event.firstReportedAt)}. Mise à jour : ${formatIncidentDate(event.updatedAt)}. Consulté le ${formatIncidentDate(event.checkedAt)}.`,
      `Sources : ${sourceUrls.join(" ; ")}`,
    ].filter(Boolean).join("\n");
    // RSS pubDate requires a time; omit it when the source only gives a day.
    const pubDate = event.updatedAt && !isDateOnly(event.updatedAt)
      ? `<pubDate>${new Date(event.updatedAt).toUTCString()}</pubDate>` : "";
    const url = `https://pa.l0g.fr/incidents/#${escapeXml(event.id)}`;
    return `<item><title>${escapeXml(event.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid>${pubDate}<description>${escapeXml(description)}</description><category>${escapeXml(event.kind)}</category></item>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>PA Check : avis d’incident</title><link>https://pa.l0g.fr/incidents/</link>
<description>Avis des éditeurs et notifications relayées : disponibilité, sécurité, attribution et niveau de confirmation.</description>
<language>fr</language><atom:link href="https://pa.l0g.fr/incidents.xml" rel="self" type="application/rss+xml" />
${items}
</channel></rss>`;
}
