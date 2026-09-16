import type { PlatformIncident } from "../data/incident-watch.ts";
import { incidentScopeLabels, incidentStatusLabels } from "../data/incident-watch.ts";

const escapeXml = (value: string) => value.replace(/[<>&"']/g, character => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]!);
export function renderIncidentRss(events: readonly PlatformIncident[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>PA Check : avis d’incident</title><link>https://pa.l0g.fr/incidents/</link>
<description>Publications vérifiées des éditeurs : disponibilité, services concernés et mises à jour.</description>
<language>fr</language><atom:link href="https://pa.l0g.fr/incidents.xml" rel="self" type="application/rss+xml" />
${events.map(event => `<item><title>${escapeXml(event.title)}</title><link>https://pa.l0g.fr/incidents/#${escapeXml(event.id)}</link><guid isPermaLink="true">https://pa.l0g.fr/incidents/#${escapeXml(event.id)}</guid><pubDate>${new Date(event.updatedAt).toUTCString()}</pubDate><description>${escapeXml(`${event.summary}\nÉtat : ${incidentStatusLabels[event.status]}. Périmètre : ${incidentScopeLabels[event.scope]}.`)}</description><category>${escapeXml(event.kind)}</category></item>`).join("\n")}
</channel></rss>`;
}
