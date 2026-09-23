import { z } from "zod";
import rawIncidents from "./platform-incidents.json" with { type: "json" };
import sources from "./sources.json" with { type: "json" };
import { platforms } from "./platforms.ts";
import rawFeeds from "./incident-watch-sources.json" with { type: "json" };
import rawResearch from "./incident-research.json" with { type: "json" };
import { incidentDateAfter } from "../lib/incident-dates.ts";

export const INCIDENT_WATCH_SINCE = "2026-09-01";
export const INCIDENT_WATCH_CHECKED_AT = "2026-09-23";
const timestamp = z.union([z.iso.datetime({ offset: true }), z.iso.date()]);
export const incidentSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  platformSlugs: z.array(z.string()),
  kind: z.enum(["availability", "security"]),
  scope: z.enum(["pa", "publisher_service", "upstream", "connected_service", "ecosystem_service"]),
  verification: z.enum(["primary_notice", "relayed_notice", "reported_claim"]).default("primary_notice"),
  affectedService: z.string().min(1).optional(),
  relationship: z.object({ note: z.string().min(1), sourceIds: z.array(z.string()).min(1) }).strict().optional(),
  title: z.string().min(1),
  summary: z.string().min(1),
  status: z.enum(["investigating", "identified", "monitoring", "resolved", "unknown"]),
  startedAt: timestamp.nullable(),
  detectedAt: timestamp.nullable().default(null),
  firstReportedAt: timestamp.nullable(),
  resolutionReportedAt: timestamp.nullable(),
  updatedAt: timestamp.nullable(),
  checkedAt: z.iso.date(),
  sourceIds: z.array(z.string()).min(1),
  limitations: z.string().min(1),
}).strict().superRefine((event, context) => {
  const { firstReportedAt: first, updatedAt: updated, resolutionReportedAt: resolved, startedAt: start, detectedAt: detected } = event;
  const dates = [first, updated, resolved, start, detected].filter((date): date is string => date !== null);
  if (dates.some(date => incidentDateAfter(date, event.checkedAt)) || (first && updated && incidentDateAfter(first, updated))) context.addIssue({ code: "custom", message: "Chronologie de publication incohérente" });
  if (start && first && incidentDateAfter(start, first)) context.addIssue({ code: "custom", message: "Début postérieur au signalement" });
  if (detected && ((start && incidentDateAfter(start, detected)) || (first && incidentDateAfter(detected, first)))) context.addIssue({ code: "custom", message: "Date de détection incohérente" });
  // A resolved notice may omit its resolution date. Preserve that missing value.
  if (resolved && event.status !== "resolved") context.addIssue({ code: "custom", message: "Résolution et notification incohérentes" });
  if (resolved && ((first && incidentDateAfter(first, resolved)) || (updated && incidentDateAfter(resolved, updated)) || (start && incidentDateAfter(start, resolved)))) context.addIssue({ code: "custom", message: "Date de résolution incohérente" });
  if (!dates.length || dates.every(date => incidentDateAfter(INCIDENT_WATCH_SINCE, date))) context.addIssue({ code: "custom", message: "Avis hors période ou période indéterminée" });
  if (event.scope === "connected_service" && (!event.affectedService || !event.relationship)) context.addIssue({ code: "custom", message: "Service connecté sans attribution documentée" });
  if (event.scope === "ecosystem_service") {
    if (event.platformSlugs.length || !event.affectedService) context.addIssue({ code: "custom", message: "Acteur hors PA sans nom ou indûment rattaché à une PA" });
  } else if (!event.platformSlugs.length) context.addIssue({ code: "custom", message: "PA concernée manquante" });
  if (event.verification === "reported_claim" && (event.kind !== "security" || event.status !== "unknown" || resolved)) context.addIssue({ code: "custom", message: "Revendication présentée comme un état confirmé" });
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
      if (!source || source.accessedAt > event.checkedAt || !["documentation", "security", "institutional", "press"].includes(source.type)) throw new Error(`Preuve d’incident invalide : ${id}`);
      if (source.type === "press" && event.verification === "primary_notice") throw new Error("Source de presse présentée comme un avis primaire");
      if (event.kind === "security" && !["security", "institutional", ...(event.verification !== "primary_notice" ? ["press"] : [])].includes(source.type)) throw new Error("Incident de sécurité sans source qualifiée");
    }
    for (const id of event.relationship?.sourceIds ?? []) {
      const source = sources.find(candidate => candidate.id === id);
      if (!source || source.accessedAt > event.checkedAt || !["documentation", "institutional"].includes(source.type)) throw new Error("Lien avec la PA sans source primaire");
    }
  }
  return events.sort((a, b) => Date.parse(b.updatedAt ?? b.firstReportedAt ?? b.checkedAt) - Date.parse(a.updatedAt ?? a.firstReportedAt ?? a.checkedAt));
}
export const platformIncidents = validateIncidents(rawIncidents);
export const incidentScopeLabels = { pa: "Facturation électronique", publisher_service: "Application de l’éditeur", upstream: "Dépendance externe", connected_service: "Service connecté à la PA", ecosystem_service: "Service hors annuaire PA" } as const;
export const incidentVerificationLabels = { primary_notice: "Avis de l’éditeur", relayed_notice: "Notification relayée", reported_claim: "Revendication non confirmée" } as const;
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
  { platformSlug: "cecurity", sourceIds: ["welyb-status-20260916"], checkedAt: "2026-09-23", status: "partial", note: "Page Welyb relue le 23 septembre : la connexion de nouveaux dossiers à eFacture reste signalée comme perturbée. Les nouveaux avis sur la clôture des exercices et le dépôt Bobbee sont publiés séparément, hors attribution à Cecurity." },
  { platformSlug: "sage", sourceIds: ["sage-status-2026-09"], checkedAt: "2026-09-23", status: "reviewed", note: "Flux relu le 23 septembre après les précédentes revues : les nouveaux avis décrivent d’autres produits ou pays. Les maintenances et avis sans périmètre français établi restent hors du journal." },
  { platformSlug: "pennylane", sourceIds: ["pennylane-status-2026-09"], checkedAt: "2026-09-23", status: "reviewed", note: "Flux relu le 23 septembre. L’avis de septembre connu porte sur l’application ; son impact éventuel sur les flux PA reste à documenter." },
  { platformSlug: "qonto", sourceIds: ["qonto-status-2026-09"], checkedAt: "2026-09-23", status: "partial", note: "La page d’historique de septembre est de nouveau lisible et affiche une liste vide au 23 septembre. La disponibilité de la PA et des services bancaires reste à vérifier séparément." },
  { platformSlug: "esker", sourceIds: ["esker-status-2026-09"], checkedAt: "2026-09-23", status: "partial", note: "Environnement G relu le 23 septembre. L’avis du 15 a disparu au relevé du 22 ; son état final reste à confirmer, faute d’annonce de résolution retrouvée." },
  { platformSlug: "sellsy", sourceIds: ["sellsy-status-2026-09"], checkedAt: "2026-09-16", status: "partial", note: "État courant consulté. L’historique depuis le 1er septembre et la disponibilité de la PA restent à documenter. Le site refuse notre collecte automatique." },
  { platformSlug: "dext", sourceIds: ["dext-status-2026-09"], checkedAt: "2026-09-16", status: "partial", note: "Le rapport HTTP de Dext Prepare couvre une partie de la période. Un suivi propre à la PA française reste à documenter." },
] as const;
const feedNotes: Record<string, string> = {
  docoon: "Flux Docoon Invoice relu le 23 septembre. Les entrées disponibles sont antérieures à septembre. Le flux Messaging précédemment raccordé a été remplacé.",
  superpdp: "Flux relu le 23 septembre, après la lecture de la page le 20. Incident de chargement de l’annuaire du 18 septembre publié, avec résolution annoncée. Horaires limités au jour en raison des fuseaux contradictoires.",
  weproc: "Flux WeInvoice relu le 23 septembre, après la revue de son historique. Deux avis sur Peppol et l’annuaire PISTE, attribués à leur auteur.",
  spendesk: "Flux et avis relus le 23 septembre : nouvel incident de réception des factures françaises le 22, connexion iOS rétablie le 23, paiements par carte toujours en investigation.",
  myunisoft: "Calendrier public et deux avis de septembre relus. Le périmètre cité est la production comptable et fiscale.",
  dokapi: "Flux et avis du 16 septembre relus. La perturbation publiée concerne l’envoi des e-mails.",
  invopop: "Flux et deux avis de septembre relus : interface de la console et migration du SML Peppol.",
  tungsten: "Flux Europe relu le 23 septembre. Les nouveaux avis concernent les échanges KSeF en Pologne et AP Essentials. Leur impact sur la PA française reste non documenté ; ils sont conservés dans les preuves de revue.",
  "pitney-bowes": "Flux public relu : les avis de septembre concernent les API d’expédition et les transporteurs. Leur impact sur la PA française reste à documenter.",
  tiime: "API publique consultée : liste d’événements vide dans la fenêtre de 30 jours fournie par l’éditeur.",
  ademico: "API publique consultée : liste d’événements vide dans la fenêtre de 30 jours fournie par l’éditeur.",
};
export const incidentCoverage = [
  ...initialIncidentCoverage,
  ...incidentFeeds.filter(feed => feed.platformSlugs.length && !initialIncidentCoverage.some(item => feed.platformSlugs.includes(item.platformSlug))).flatMap(feed => feed.platformSlugs.map(platformSlug => ({
    platformSlug, sourceIds: [feed.sourceId], checkedAt: feed.checkedAt, status: "partial" as const,
    note: feedNotes[platformSlug] ?? "Flux officiel relu le 23 septembre. Les publications disponibles portent sur les services de l’éditeur ; la profondeur historique dépend du flux fourni.",
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
export const incidentWatchLimit = "Ce journal réunit les avis des éditeurs, les notifications relayées et les revendications à confirmer. Chaque signalement précise son niveau de confirmation et le service concerné. Certains avis se recoupent. La couverture reste partielle ; l’évaluation de la disponibilité et de la sécurité exige aussi des mesures techniques et des audits.";
export const securityReview = {
  checkedAt: "2026-09-23",
  status: "public_search_completed" as const,
  platformCount: incidentResearch.length,
  note: "La recherche nominative des 149 PA du 20 septembre est complétée le 23 par la revue des flux et des recherches ciblées. Quatre signalements de sécurité sont publiés : Welyb / AGIRIS CONNECT, Zenfirst, Altagem et Faktus. La connexion Altagem-Iopole est documentée séparément de la revendication. L’impact sur les PA partenaires reste non établi.",
  sourceIds: ["cert-fr-sap-20260908", "blg-security-20260810", "frenchbreaches-welyb-20260915", "welyb-cecurity-integration", "frenchbreaches-zenfirst-20260917", "zenfirst-integration-20260920", "frenchbreaches-altagem-20260921", "altagem-iopole-integration-20260923", "frenchbreaches-faktus-20260919", "faktus-financement-20260923"],
  findings: [
    { platformSlug: "sap", type: "vulnerability_advisory" as const, title: "SAP : bulletin de correctifs du 8 septembre", note: "Le CERT-FR recense des vulnérabilités dans plusieurs produits SAP. Ce bulletin appelle une vérification des produits et versions utilisés ; il décrit des failles logicielles, sans signaler de compromission d’une PA.", sourceIds: ["cert-fr-sap-20260908"] },
    { platformSlug: "blg", type: "outside_period" as const, title: "blgCloud : notification antérieure à la période", note: "La notification officielle du 10 août décrit une attaque de juillet. Elle est conservée comme contexte et exclue du compteur des incidents de septembre. Les nouvelles mentions de presse demandent un recoupement.", sourceIds: ["blg-security-20260810"] },
  ],
};
export function incidentsForPlatform(slug: string) {
  return {
    since: INCIDENT_WATCH_SINCE,
    coverage: incidentCoverage.find(item => item.platformSlug === slug) ?? { platformSlug: slug, status: "not_reviewed", checkedAt: null, sourceIds: [], note: "Recherche de sources actualisée le 20 septembre. Historique de disponibilité non documenté dans les sources retenues." },
    incidents: platformIncidents.filter(event => event.platformSlugs.includes(slug)),
    limit: incidentWatchLimit,
    security: { ...incidentResearch.find(item => item.platformSlug === slug), status: "public_search_completed" },
    feeds: incidentFeeds.filter(feed => feed.platformSlugs.includes(slug)),
  };
}
export function incidentWatchCorpus() {
  const sourceIds = new Set([...platformIncidents.flatMap(event => [...event.sourceIds, ...(event.relationship?.sourceIds ?? [])]), ...incidentCoverage.flatMap(item => [...item.sourceIds]), ...incidentFeeds.map(feed => feed.sourceId), ...securityReview.sourceIds]);
  return { schemaVersion: "2.1", since: INCIDENT_WATCH_SINCE, checkedAt: INCIDENT_WATCH_CHECKED_AT, limit: incidentWatchLimit, securityReview, research: incidentResearch, collection: { intervalMinutes: 1440, publication: "reviewed", feeds: incidentFeeds }, coverage: platforms.map(platform => incidentsForPlatform(platform.slug).coverage), incidents: platformIncidents, sources: sources.filter(source => sourceIds.has(source.id)) };
}
