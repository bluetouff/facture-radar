import { z } from "zod";
import rawIncidents from "./platform-incidents.json" with { type: "json" };
import sources from "./sources.json" with { type: "json" };
import { platforms } from "./platforms.ts";
import rawFeeds from "./incident-watch-sources.json" with { type: "json" };
import rawResearch from "./incident-research.json" with { type: "json" };

export const INCIDENT_WATCH_SINCE = "2026-09-01";
export const INCIDENT_WATCH_CHECKED_AT = "2026-09-16";
const timestamp = z.iso.datetime({ offset: true });
export const incidentSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  platformSlugs: z.array(z.string()).min(1),
  kind: z.enum(["availability", "security"]),
  scope: z.enum(["pa", "publisher_service", "upstream"]),
  title: z.string().min(1),
  summary: z.string().min(1),
  status: z.enum(["investigating", "identified", "monitoring", "resolved", "unknown"]),
  startedAt: timestamp.nullable(),
  firstReportedAt: timestamp,
  resolutionReportedAt: timestamp.nullable(),
  updatedAt: timestamp,
  checkedAt: z.iso.date(),
  sourceIds: z.array(z.string()).min(1),
  limitations: z.string().min(1),
}).strict().superRefine((event, context) => {
  const first = Date.parse(event.firstReportedAt);
  const updated = Date.parse(event.updatedAt);
  const checkEnd = Date.parse(`${event.checkedAt}T23:59:59Z`);
  if (updated < first || updated > checkEnd || first > checkEnd) context.addIssue({ code: "custom", message: "Chronologie de publication incohérente" });
  if (event.startedAt && Date.parse(event.startedAt) > first) context.addIssue({ code: "custom", message: "Début postérieur au signalement" });
  if ((event.status === "resolved") !== (event.resolutionReportedAt !== null)) context.addIssue({ code: "custom", message: "Résolution et notification incohérentes" });
  if (event.resolutionReportedAt && (Date.parse(event.resolutionReportedAt) < first || Date.parse(event.resolutionReportedAt) > updated)) context.addIssue({ code: "custom", message: "Date de résolution incohérente" });
  if (updated < Date.parse(`${INCIDENT_WATCH_SINCE}T00:00:00+02:00`)) context.addIssue({ code: "custom", message: "Avis hors période" });
});
export type PlatformIncident = z.infer<typeof incidentSchema>;

export function validateIncidents(input: unknown): PlatformIncident[] {
  const events = z.array(incidentSchema).parse(input);
  const ids = new Set<string>();
  for (const event of events) {
    if (ids.has(event.id)) throw new Error(`Avis dupliqué : ${event.id}`);
    ids.add(event.id);
    if (event.checkedAt > INCIDENT_WATCH_CHECKED_AT) throw new Error("Avis postérieur à la revue");
    for (const slug of event.platformSlugs) if (!platforms.some(platform => platform.slug === slug)) throw new Error(`PA inconnue : ${slug}`);
    for (const id of event.sourceIds) {
      const source = sources.find(candidate => candidate.id === id);
      if (!source || source.accessedAt > event.checkedAt || !["documentation", "security", "institutional"].includes(source.type)) throw new Error(`Preuve d’incident invalide : ${id}`);
      if (event.kind === "security" && !["security", "institutional"].includes(source.type)) throw new Error("Incident de sécurité sans source qualifiée");
    }
  }
  return events.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}
export const platformIncidents = validateIncidents(rawIncidents);
export const incidentScopeLabels = { pa: "Facturation électronique", publisher_service: "Application de l’éditeur", upstream: "Dépendance externe" } as const;
export const incidentStatusLabels = { investigating: "Investigation annoncée", identified: "Cause identifiée", monitoring: "Sous surveillance", resolved: "Résolution annoncée", unknown: "État non précisé" } as const;

const httpsUrl = z.url().refine(value => new URL(value).protocol === "https:" && !new URL(value).username && !new URL(value).password);
export const incidentFeeds = z.array(z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), platformSlugs: z.array(z.string()), name: z.string().min(1),
  url: httpsUrl, pageUrl: httpsUrl, sourceId: z.string(),
  kind: z.enum(["rss", "atom", "json", "esker"]),
  profile: z.enum(["statuspage", "statuspal", "incident-io", "betterstack", "cachet", "instatus", "ohdear", "cert-fr", "esker", "myunisoft", "uptimerobot-events"]),
  checkedAt: z.iso.date(), note: z.string().min(1),
}).strict()).parse(rawFeeds);
export const incidentResearch = z.array(z.object({
  platformSlug: z.string(), checkedAt: z.iso.date(), status: z.literal("searched"),
  feedIds: z.array(z.string()), note: z.string().min(1),
}).strict()).parse(rawResearch);
if (incidentResearch.length !== platforms.length || new Set(incidentResearch.map(item => item.platformSlug)).size !== platforms.length) throw new Error("Couverture de recherche incomplète ou dupliquée");
if (new Set(incidentFeeds.map(item => item.id)).size !== incidentFeeds.length) throw new Error("Flux dupliqué");
for (const item of incidentResearch) {
  if (!platforms.some(platform => platform.slug === item.platformSlug) || item.checkedAt > INCIDENT_WATCH_CHECKED_AT) throw new Error("Recherche PA invalide");
  for (const id of item.feedIds) if (!incidentFeeds.some(feed => feed.id === id && feed.platformSlugs.includes(item.platformSlug))) throw new Error("Flux de recherche inconnu");
}
for (const feed of incidentFeeds) {
  if (!sources.some(source => source.id === feed.sourceId && source.url === feed.pageUrl && source.accessedAt <= feed.checkedAt)) throw new Error("Source de flux invalide");
  if (feed.checkedAt > INCIDENT_WATCH_CHECKED_AT || feed.platformSlugs.some(slug => !platforms.some(platform => platform.slug === slug))) throw new Error("Attribution de flux invalide");
}

// A reviewed public page does not establish full historical or PA coverage.
const initialIncidentCoverage = [
  { platformSlug: "sage", sourceIds: ["sage-status-2026-09"], checkedAt: "2026-09-16", status: "reviewed", note: "Historique public du 1er au 16 septembre : avis de facturation française et services citant la France. Autres pays et maintenances exclus." },
  { platformSlug: "pennylane", sourceIds: ["pennylane-status-2026-09"], checkedAt: "2026-09-16", status: "reviewed", note: "Historique public du 1er au 16 septembre relu. Les avis portent sur l’application. Leur impact éventuel sur les flux PA reste à documenter." },
  { platformSlug: "qonto", sourceIds: ["qonto-status-2026-09"], checkedAt: "2026-09-16", status: "reviewed", note: "L’historique officiel de septembre était vide lors du contrôle. La disponibilité de la PA et des services bancaires reste à vérifier séparément." },
  { platformSlug: "esker", sourceIds: ["esker-status-2026-09"], checkedAt: "2026-09-16", status: "partial", note: "Revue des avis affichés par environnement, dont celui concernant l’environnement G. L’historique depuis le 1er septembre reste à compléter." },
  { platformSlug: "sellsy", sourceIds: ["sellsy-status-2026-09"], checkedAt: "2026-09-16", status: "partial", note: "État courant consulté. L’historique depuis le 1er septembre et la disponibilité de la PA restent à documenter. Le site refuse notre collecte automatique." },
  { platformSlug: "dext", sourceIds: ["dext-status-2026-09"], checkedAt: "2026-09-16", status: "partial", note: "Le rapport HTTP de Dext Prepare couvre une partie de la période. Un suivi propre à la PA française reste à documenter." },
] as const;
const feedNotes: Record<string, string> = {
  weproc: "Historique WeInvoice et flux relus du 1er au 16 septembre. Deux avis sur Peppol et l’annuaire PISTE, attribués à leur auteur.",
  spendesk: "Historique et flux relus du 1er au 16 septembre : facturation française, accès à l’application, e-mails et virements internationaux.",
  myunisoft: "Calendrier public et deux avis de septembre relus. Le périmètre cité est la production comptable et fiscale.",
  dokapi: "Flux et avis du 16 septembre relus. La perturbation publiée concerne l’envoi des e-mails.",
  invopop: "Flux et deux avis de septembre relus : interface de la console et migration du SML Peppol.",
  tungsten: "Flux Europe relu. Avis d’assistance eInvoice Network retenu. Les avis propres à la Pologne, la Roumanie, la Croatie et à Printix restent hors du périmètre français de ce journal.",
  "pitney-bowes": "Flux public relu : les avis de septembre concernent les API d’expédition et les transporteurs. Leur impact sur la PA française reste à documenter.",
  tiime: "API publique consultée : liste d’événements vide dans la fenêtre de 30 jours fournie par l’éditeur.",
  ademico: "API publique consultée : liste d’événements vide dans la fenêtre de 30 jours fournie par l’éditeur.",
};
export const incidentCoverage = [
  ...initialIncidentCoverage,
  ...incidentFeeds.filter(feed => feed.platformSlugs.length && !initialIncidentCoverage.some(item => feed.platformSlugs.includes(item.platformSlug))).flatMap(feed => feed.platformSlugs.map(platformSlug => ({
    platformSlug, sourceIds: [feed.sourceId], checkedAt: feed.checkedAt, status: "partial" as const,
    note: feedNotes[platformSlug] ?? "Flux officiel relu le 16 septembre. Les publications disponibles portent sur les services de l’éditeur ; la profondeur historique dépend du flux fourni.",
  }))),
  {"platformSlug": "aruba", "sourceIds": ["aruba-manual-status-2026-09"], "checkedAt": "2026-09-16", "status": "partial", "note": "Page d’alertes consultée. La rubrique de service était vide ; les exemples de phishing visibles étaient antérieurs à septembre."},
  {"platformSlug": "docuware", "sourceIds": ["docuware-manual-status-2026-09"], "checkedAt": "2026-09-16", "status": "partial", "note": "Portail d’état identifié. L’extraction publique présente des informations anciennes ; la chronologie de septembre demande un contrôle dans le portail interactif."},
  {"platformSlug": "iopole", "sourceIds": ["iopole-manual-status-2026-09"], "checkedAt": "2026-09-16", "status": "partial", "note": "Page de suivi de l’API identifiée. Le contenu historique est chargé dynamiquement et reste à vérifier."},
  {"platformSlug": "mysupply", "sourceIds": ["mysupply-manual-status-2026-09"], "checkedAt": "2026-09-16", "status": "partial", "note": "Page opérationnelle consultée. Les tableaux des incidents en cours et des maintenances exceptionnelles étaient vides ; les maintenances hebdomadaires sont affichées séparément."},
  {"platformSlug": "odoo", "sourceIds": ["odoo-manual-status-2026-09"], "checkedAt": "2026-09-16", "status": "partial", "note": "Page d’état consultée. Le contenu extrait mêle des exemples et des événements anciens ; il est insuffisant pour établir un historique fiable de septembre."},
  {"platformSlug": "pagero", "sourceIds": ["pagero-manual-status-2026-09"], "checkedAt": "2026-09-16", "status": "partial", "note": "Ancien flux RSS redirigé vers une page inactive lors du contrôle. Collecte suspendue ; une source de remplacement reste à confirmer."},
  {"platformSlug": "sovos", "sourceIds": ["sovos-manual-status-2026-09"], "checkedAt": "2026-09-16", "status": "partial", "note": "Ancien flux servicestatus désactivé. Le nouveau portail répartit les services par région ; le suivi européen demande un nouveau raccordement."},
  { platformSlug: "atgp", sourceIds: ["atgp-status-2026-09"], checkedAt: "2026-09-16", status: "partial" as const, note: "La page ATGP indique les anomalies en cours. Lors de la revue, elle affiche « Aucune anomalie recensée actuellement ». Historique antérieur à documenter." },
];
export const incidentWatchLimit = "Ce journal repose sur les communications des éditeurs. Certains avis concernent le même incident. Leur nombre reflète les informations publiées, avec une couverture variable selon les plateformes. L’évaluation de la disponibilité et de la sécurité exige aussi des mesures techniques et des audits.";
export const securityReview = {
  checkedAt: "2026-09-16",
  status: "public_search_completed" as const,
  platformCount: incidentResearch.length,
  note: "Les 149 PA ont fait l’objet d’une recherche nominative de sécurité et d’une recherche de sources de disponibilité le 16 septembre. Les avis CERT-FR ont également été consultés. Cette passe couvre les informations publiques repérées du 1er au 16 septembre ; les notifications privées restent hors du périmètre.",
  sourceIds: ["cert-fr-sap-20260908", "blg-security-20260810"],
  findings: [
    { platformSlug: "sap", type: "vulnerability_advisory" as const, title: "SAP : bulletin de correctifs du 8 septembre", note: "Le CERT-FR recense des vulnérabilités dans plusieurs produits SAP. Ce bulletin appelle une vérification des produits et versions utilisés ; il décrit des failles logicielles, sans signaler de compromission d’une PA.", sourceIds: ["cert-fr-sap-20260908"] },
    { platformSlug: "blg", type: "outside_period" as const, title: "blgCloud : notification antérieure à la période", note: "La notification officielle du 10 août décrit une attaque de juillet. Elle est conservée comme contexte et exclue du compteur des incidents de septembre. Les nouvelles mentions de presse demandent un recoupement.", sourceIds: ["blg-security-20260810"] },
  ],
};
export function incidentsForPlatform(slug: string) {
  return {
    since: INCIDENT_WATCH_SINCE,
    coverage: incidentCoverage.find(item => item.platformSlug === slug) ?? { platformSlug: slug, status: "not_reviewed", checkedAt: null, sourceIds: [], note: "Recherche de sources effectuée le 16 septembre. Historique de disponibilité non documenté dans les sources retenues." },
    incidents: platformIncidents.filter(event => event.platformSlugs.includes(slug)),
    limit: incidentWatchLimit,
    security: { ...incidentResearch.find(item => item.platformSlug === slug), status: "public_search_completed" },
    feeds: incidentFeeds.filter(feed => feed.platformSlugs.includes(slug)),
  };
}
export function incidentWatchCorpus() {
  const sourceIds = new Set([...platformIncidents.flatMap(event => event.sourceIds), ...incidentCoverage.flatMap(item => [...item.sourceIds]), ...incidentFeeds.map(feed => feed.sourceId), ...securityReview.sourceIds]);
  return { schemaVersion: "1.1", since: INCIDENT_WATCH_SINCE, checkedAt: INCIDENT_WATCH_CHECKED_AT, limit: incidentWatchLimit, securityReview, research: incidentResearch, collection: { intervalMinutes: 1440, publication: "reviewed", feeds: incidentFeeds }, coverage: platforms.map(platform => incidentsForPlatform(platform.slug).coverage), incidents: platformIncidents, sources: sources.filter(source => sourceIds.has(source.id)) };
}
