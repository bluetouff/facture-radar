import { SaxesParser } from "saxes";
import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";

export const FEED_LIMIT = 2 * 1024 * 1024;
export const watchSources = Object.freeze([
  { id: "sage", url: "https://status.sage.com/history.rss", kind: "rss" },
  { id: "pennylane", url: "https://status.pennylane.com/history.rss", kind: "rss" },
  { id: "esker", url: "https://www.trustesker.com/?env=G", kind: "esker" },
]);
export const digest = text => createHash("sha256").update(text).digest("hex");
export function assertWatchSource(source) {
  if (!watchSources.some(item => item.id === source.id && item.url === source.url && item.kind === source.kind)) throw new Error("Source absente de la liste autorisée");
}
export function parseWatchSource(source, body, now = Date.now()) {
  assertWatchSource(source);
  if (Buffer.byteLength(body) > FEED_LIMIT) throw new Error("Réponse trop volumineuse");
  if (source.kind === "esker") {
    if (!body.includes('class="tower_detail"') || !body.includes("Service availability")) throw new Error("Structure TrustEsker inattendue");
    const candidates = [];
    for (const section of body.split('class="tower_detail"').slice(1)) {
      const environment = section.match(/id="detail_tower_([A-Z0-9_]+)"/)?.[1];
      if (!environment) throw new Error("Environnement TrustEsker non identifié");
      const messages = [...section.matchAll(/<div class=['"]message message_ProductionIncident_[^'"]+['"]>[\s\S]*?(?=<div class="status_container")/g)].map(match => match[0]);
      if (section.includes("message_ProductionIncident_") && !messages.length) throw new Error("Avis TrustEsker non reconnu");
      candidates.push({ id: `esker-environment-${environment}`, url: `https://www.trustesker.com/?env=${environment}`, title: `TrustEsker environnement ${environment}`, publishedAt: null, noticeVisible: messages.length > 0, content: messages.join("\n") || "Aucun avis actuellement visible. Ce retrait ne prouve pas une résolution.", fingerprint: digest(messages.join("\n").replace(/\s+/g, " ")) });
    }
    return candidates;
  }
  if (/<!\s*(DOCTYPE|ENTITY)/i.test(body)) throw new Error("Déclaration XML externe refusée");
  const validator = new SaxesParser();
  validator.write(body).close();
  const parsed = new XMLParser({ ignoreAttributes: true, parseTagValue: false, processEntities: false }).parse(body);
  const channel = parsed?.rss?.channel;
  if (!channel || typeof channel !== "object") throw new Error("Canal RSS absent");
  const items = channel.item === undefined ? [] : Array.isArray(channel.item) ? channel.item : [channel.item];
  if (items.length > 500) throw new Error("Trop d’éléments RSS");
  const seen = new Set();
  return items.filter(item => typeof item.title !== "string" || !/Scheduled Maintenance/i.test(item.title)).map(item => {
    if (typeof item.link !== "string" || typeof item.title !== "string" || typeof item.description !== "string" || typeof item.pubDate !== "string") throw new Error("Élément RSS incomplet");
    const url = new URL(item.link);
    if (url.origin !== new URL(source.url).origin || !/^\/incidents\/[a-z0-9]+$/.test(url.pathname) || url.username || url.password || url.search || url.hash) throw new Error("Lien incident hors périmètre");
    const published = Date.parse(item.pubDate);
    if (!Number.isFinite(published) || published > now + 60_000 || item.title.length > 1000 || item.description.length > 100_000) throw new Error("Date ou contenu RSS invalide");
    const id = `${source.id}-${url.pathname.split("/").at(-1)}`;
    if (seen.has(id)) throw new Error("Avis RSS dupliqué");
    seen.add(id);
    // pubDate is the feed publication/update timestamp, never an outage start.
    return { id, url: url.href, title: item.title, publishedAt: new Date(published).toISOString(), content: item.description, fingerprint: digest(JSON.stringify([item.title, item.pubDate, item.description])) };
  }).filter(item => item.publishedAt >= "2026-08-31T22:00:00.000Z");
}
export function compareCandidates(previous, current) {
  return current.filter(item => previous[item.id]?.fingerprint !== item.fingerprint)
    .map(item => ({ ...item, change: previous[item.id] ? "updated" : "new" }));
}
