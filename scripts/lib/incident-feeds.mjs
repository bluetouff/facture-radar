import { SaxesParser } from "saxes";
import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import registry from "../../src/data/incident-watch-sources.json" with { type: "json" };

export const FEED_LIMIT = 2 * 1024 * 1024;
export const watchSources = Object.freeze(registry.map(source => Object.freeze(source)));
export const digest = text => createHash("sha256").update(text).digest("hex");
export function assertWatchSource(source) {
  if (!watchSources.some(item => item.id === source.id && item.url === source.url && item.kind === source.kind && item.profile === source.profile)) throw new Error("Source absente de la liste autorisée");
}
const since = "2026-08-31T22:00:00.000Z";
const list = value => value === undefined ? [] : Array.isArray(value) ? value : [value];
const xmlText = value => typeof value === "string" ? value : value?.["#text"];
function timestamp(value, now) {
  // Require an explicit timezone; never interpret a publisher date in the runner's timezone.
  if (typeof value !== "string" || !/(?:Z|GMT|UTC|[+-]\d{2}:?\d{2})\s*$/.test(value)) throw new Error("Fuseau absent");
  const date = Date.parse(value);
  if (!Number.isFinite(date) || date > now + 60_000) throw new Error("Date de flux invalide");
  return new Date(date).toISOString();
}
function incidentUrl(source, value) {
  if (typeof value !== "string") throw new Error("Lien absent");
  const url = new URL(value, source.url);
  const paths = {
    statuspage: /^\/incidents\/[a-z0-9]+$/,
    statuspal: /^\/{1,2}incidents\/[A-Za-z0-9]+$/,
    "incident-io": /^\/europe\/incidents\/[A-Za-z0-9]+$/,
    betterstack: /^(?:\/fr)?\/incident\/\d+$/,
    cachet: /^\/incident\/\d+\/$/,
    instatus: /^\/incident\/[a-z0-9]+$/,
    ohdear: /^\/(?:updates|incidents)\/[a-z0-9-]+\/?$/,
    "cert-fr": /^\/(?:avis|alerte|actualite|cti|ioc|dur)\/CERTFR-\d{4}-[A-Z]+-\d+\/$/,
    myunisoft: /^\/incident\/[a-f0-9-]{36}\/$/,
  };
  if (url.origin !== new URL(source.url).origin || url.username || url.password || url.search || url.hash || !paths[source.profile]?.test(url.pathname)) throw new Error("Lien incident hors périmètre");
  return url.href;
}
function candidate(source, item, now) {
  const url = incidentUrl(source, item.url);
  if (typeof item.title !== "string" || !item.title.trim() || item.title.length > 1000 || typeof item.content !== "string" || item.content.length > 100_000) throw new Error("Contenu de flux invalide");
  const publishedAt = timestamp(item.publishedAt, now);
  return { id: `${source.id}-${new URL(url).pathname.split("/").filter(Boolean).at(-1)}`, sourceId: source.id, url, title: item.title, publishedAt, content: item.content, fingerprint: digest(JSON.stringify([item.title, publishedAt, item.content])) };
}
function parseJson(source, body, now) {
  const parsed = JSON.parse(body);
  if (source.profile === "uptimerobot-events") {
    if (parsed?.status !== true || !Array.isArray(parsed.results) || parsed.results.length > 500 || parsed.meta?.count !== parsed.results.length) throw new Error("API événements invalide");
    const from = timestamp(parsed.meta?.date_range?.from, now), to = timestamp(parsed.meta?.date_range?.to, now);
    if (from > to || Date.parse(to) < now - 24 * 3600_000) throw new Error("Fenêtre de collecte périmée");
    // No nonempty payload has yet been documented. Preserve any new structure for review.
    if (!parsed.results.length) return [];
    const content = JSON.stringify(parsed.results);
    return [{ id: `${source.id}-events`, sourceId: source.id, url: source.pageUrl, title: `Événements publiés par ${source.name}`, publishedAt: null, content, fingerprint: digest(content) }];
  }
  if (source.profile !== "myunisoft" || !Array.isArray(parsed) || parsed.length > 500) throw new Error("Calendrier JSON invalide");
  const ids = new Set();
  return parsed.map(item => {
    const start = timestamp(item.start, now), end = item.end == null ? null : timestamp(item.end, now);
    if (end && end < start) throw new Error("Chronologie JSON invalide");
    const result = candidate(source, { url: item.url, title: item.title, publishedAt: end ?? start, content: JSON.stringify({ title: item.title, calendarStart: start, calendarEnd: end }) }, now);
    if (item.id !== result.id.slice(source.id.length + 1) || ids.has(result.id)) throw new Error("Identifiant calendrier invalide");
    ids.add(result.id);
    return result;
  }).filter(item => item.publishedAt >= since);
}
export function parseWatchSource(source, body, now = Date.now()) {
  assertWatchSource(source);
  if (Buffer.byteLength(body) > FEED_LIMIT) throw new Error("Réponse trop volumineuse");
  if (source.kind === "json") return parseJson(source, body, now);
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
  const parsed = new XMLParser({ ignoreAttributes: false, parseTagValue: false, processEntities: false }).parse(body);
  const channel = source.kind === "atom" ? parsed?.feed : parsed?.rss?.channel;
  if (!channel || typeof channel !== "object") throw new Error("Canal RSS absent");
  const items = list(source.kind === "atom" ? channel.entry : channel.item);
  if (items.length > 500) throw new Error("Trop d’éléments RSS");
  const grouped = new Map();
  for (const item of items) {
    const title = xmlText(item.title);
    if (item.category === "Maintenance" || (typeof item.description === "string" && /^Type:\s*Maintenance\b/.test(item.description)) || (typeof title === "string" && /(?:^Maintenance\b|\bScheduled\s+Maint(?:enance|anance)\b|\bMaintenance\s*[-:])/i.test(title))) continue;
    const atom = source.kind === "atom";
    const row = candidate(source, {
      title,
      url: atom ? list(item.link).find(link => link["@_rel"] === "alternate")?.["@_href"] : item.link,
      publishedAt: atom ? item.updated ?? item.published : item.pubDate,
      content: atom ? xmlText(item.content) || xmlText(item.summary) || "" : xmlText(item.description),
    }, now);
    const prior = grouped.get(row.id);
    if (prior && source.profile !== "betterstack") throw new Error("Avis RSS dupliqué");
    if (!prior) grouped.set(row.id, row);
    else if (row.publishedAt === prior.publishedAt && row.fingerprint !== prior.fingerprint) throw new Error("Versions contradictoires d’un avis");
    else if (row.publishedAt > prior.publishedAt) grouped.set(row.id, row);
    // Better Stack emits one entry per update under the same incident URL.
  }
  return [...grouped.values()].filter(item => item.publishedAt >= since);
}
export function compareCandidates(previous, current) {
  return current.filter(item => previous[item.id]?.fingerprint !== item.fingerprint)
    .map(item => ({ ...item, change: previous[item.id] ? "updated" : "new" }));
}
