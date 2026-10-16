import { z } from "zod";
import rawIncidents from "./platform-incidents.json" with { type: "json" };
import sources from "./sources.json" with { type: "json" };
import { platforms } from "./platforms.ts";
import rawFeeds from "./incident-watch-sources.json" with { type: "json" };
import rawResearch from "./incident-research.json" with { type: "json" };
import { incidentDateAfter } from "../lib/incident-dates.ts";

export const INCIDENT_WATCH_SINCE = "2026-09-01";
export const INCIDENT_WATCH_CHECKED_AT = "2026-10-16";
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
  firstObservedAt: timestamp.nullable().default(null),
  resolutionReportedAt: timestamp.nullable(),
  updatedAt: timestamp.nullable(),
  checkedAt: z.iso.date(),
  sourceIds: z.array(z.string()).min(1),
  limitations: z.string().min(1),
}).strict().superRefine((event, context) => {
  const { firstReportedAt: first, firstObservedAt: observed, updatedAt: updated, resolutionReportedAt: resolved, startedAt: start, detectedAt: detected } = event;
  const dates = [first, updated, resolved, start, detected].filter((date): date is string => date !== null);
  if (dates.some(date => incidentDateAfter(date, event.checkedAt)) || (first && updated && incidentDateAfter(first, updated))) context.addIssue({ code: "custom", message: "Chronologie de publication incohérente" });
  if (observed && incidentDateAfter(observed, event.checkedAt)) context.addIssue({ code: "custom", message: "Observation postérieure à la consultation" });
  if (start && first && incidentDateAfter(start, first)) context.addIssue({ code: "custom", message: "Début postérieur au signalement" });
  if (detected && ((start && incidentDateAfter(start, detected)) || (first && incidentDateAfter(detected, first)))) context.addIssue({ code: "custom", message: "Date de détection incohérente" });
  // A resolved notice may omit its resolution date. Preserve that missing value.
  if (resolved && event.status !== "resolved") context.addIssue({ code: "custom", message: "Résolution et notification incohérentes" });
  if (resolved && ((first && incidentDateAfter(first, resolved)) || (updated && incidentDateAfter(resolved, updated)) || (start && incidentDateAfter(start, resolved)))) context.addIssue({ code: "custom", message: "Date de résolution incohérente" });
  // Observation dates qualify undated notices, but cannot move a dated old incident into the period.
  const periodDates = dates.length ? dates : observed ? [observed] : [];
  if (!periodDates.length || periodDates.every(date => incidentDateAfter(INCIDENT_WATCH_SINCE, date))) context.addIssue({ code: "custom", message: "Avis hors période ou période indéterminée" });
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
  return events.sort((a, b) => Date.parse(b.updatedAt ?? b.firstReportedAt ?? b.firstObservedAt ?? b.startedAt ?? b.checkedAt) - Date.parse(a.updatedAt ?? a.firstReportedAt ?? a.firstObservedAt ?? a.startedAt ?? a.checkedAt));
}
export const platformIncidents = validateIncidents(rawIncidents);
export const incidentScopeLabels = { pa: "Facturation électronique", publisher_service: "Application de l’éditeur", upstream: "Dépendance externe", connected_service: "Service connecté à la PA", ecosystem_service: "Service hors annuaire PA" } as const;
export const incidentVerificationLabels = { primary_notice: "Avis officiel", relayed_notice: "Notification relayée", reported_claim: "Revendication non confirmée" } as const;
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
  platformSlug: z.string(), checkedAt: z.iso.date(), status: z.enum(["searched", "public_sites_reviewed"]),
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
  { platformSlug: "vosfactures", sourceIds: ["aife-vosfactures-reprise-20261004", "aife-vosfactures-20261002"], checkedAt: "2026-10-16", status: "partial", note: "Portail AIFE rendu et annonces développées le 16 octobre : le bandeau de reprise reste absent. La date de reprise et la fin de surveillance restent inconnues. Le rattachement à FACTUALI / VosFactures repose sur le bandeau original nommé. L’investigation chez le prestataire conserve son périmètre distinct." },
  { platformSlug: "jefacture", sourceIds: ["welyb-status-20260916"], checkedAt: "2026-10-16", status: "partial", note: "Welyb annonce le 16 octobre le rétablissement de la modification des statuts des factures jefacture.com depuis son portail. L’avis initial, sans date propre, a été observé le 30 septembre. Le service connecté reste distinct de la PA." },
  { platformSlug: "cecurity", sourceIds: ["welyb-status-20260916"], checkedAt: "2026-10-16", status: "partial", note: "Welyb annonce le 16 octobre le rétablissement du raccordement des nouveaux dossiers correctement paramétrés à eFacture. La récupération de certaines factures reste perturbée dans une rubrique distincte. Ces avis concernent le service connecté ; une atteinte directe à la PA reste non établie." },
  { platformSlug: "sage", sourceIds: ["sage-status-2026-09", "sage-onboarding-20261010"], checkedAt: "2026-10-16", status: "reviewed", note: "Flux et avis relus le 16 octobre. L’envoi des factures françaises revient sous surveillance le 14 à 11 h 08 UTC, puis Sage annonce la résolution à 16 h 05 UTC. L’alerte d’onboarding du 10 reste exclue : Sage y décrit des comptes incomplètement configurés. Les avis AutoEntry et Intacct conservent leurs périmètres d’application, avec impact PA non précisé." },
  { platformSlug: "pennylane", sourceIds: ["pennylane-status-2026-09"], checkedAt: "2026-10-16", status: "reviewed", note: "Flux et avis relus le 16 octobre. La perturbation de l’application du 25 septembre est résolue ; son impact sur les flux PA reste non documenté." },
  { platformSlug: "qonto", sourceIds: ["qonto-status-20261008", "qonto-status-2026-09"], checkedAt: "2026-10-16", status: "partial", note: "Historique d’octobre relu le 16 octobre : la page affiche une liste vide. La disponibilité de la PA et des services bancaires reste à vérifier séparément." },
  { platformSlug: "esker", sourceIds: ["esker-status-2026-09"], checkedAt: "2026-10-16", status: "partial", note: "Pages relues le 16 octobre. Les messages d’affichage D, E, G et K ont été retirés après les compléments des 12 et 13 annonçant un script correctif en préparation. Leur état final reste à confirmer. L’environnement L de la PA française n’était pas cité. Les autres anciens avis retirés gardent leurs résolutions inconnues." },
  { platformSlug: "sellsy", sourceIds: ["sellsy-status-2026-09"], checkedAt: "2026-09-16", status: "partial", note: "État courant consulté. L’historique depuis le 1er septembre et la disponibilité de la PA restent à documenter. Le site refuse notre collecte automatique." },
  { platformSlug: "dext", sourceIds: ["dext-status-2026-09"], checkedAt: "2026-09-16", status: "partial", note: "Le rapport HTTP de Dext Prepare couvre une partie de la période. Un suivi propre à la PA française reste à documenter." },
] as const;
const feedNotes: Record<string, string> = {
  veryswing: "Flux et deux avis du 14 octobre relus le 16. Un seul incident d’analyse documentaire est retenu. Veryswing corrige son attribution initiale à Mindee et identifie un traitement interne bloqué, rétabli le 14 à 15 h 35 Paris. Le périmètre PA reste non documenté.",
  lucca: "Flux et avis du 28 septembre relus le 16 octobre. Perturbation de certaines applications résolue ; impact sur les flux PA non précisé.",
  docoon: "Flux Docoon Invoice relu le 16 octobre. Les entrées disponibles sont antérieures à septembre. Le flux Messaging précédemment raccordé a été remplacé.",
  superpdp: "Flux relu le 16 octobre, après les précédentes lectures de la page. Incident de chargement de l’annuaire du 18 septembre publié, avec résolution annoncée. Horaires limités au jour en raison des fuseaux contradictoires.",
  weproc: "Flux et avis WeInvoice relus le 16 octobre. Les sept alertes PISTE du 3 octobre sont regroupées ; une nouvelle alerte du 7 est ajoutée. Toutes annoncent une résolution. Leur auteur reste WeInvoice ; la cause générale côté annuaire demeure à confirmer.",
  spendesk: "Flux et avis relus le 16 octobre. Un avis publié le 15 annonce une réception de factures électroniques rétablie la veille ; pays et PA ne sont pas précisés. L’avis 3DS iOS reste identifié, avec correctif en préparation chez un prestataire non nommé. Les rétablissements antérieurs des factures françaises et cartes Amazon restent documentés séparément.",
  myunisoft: "Calendrier et pages relus le 16 octobre. Les deux notifications de connexion du 2 octobre annoncent la résolution le 5. Ajout de Datalake et de la saisie des temps, avec résolutions le 6. Les dates des pages sont conservées au jour près faute de fuseau explicite.",
  dokapi: "Flux et avis du 16 septembre relus. La perturbation publiée concerne l’envoi des e-mails.",
  invopop: "Flux et avis relus. Le compte rendu du 3 octobre confirme un incident de traitement et téléchargement de documents, dont les intégrations France, rétabli le même jour. API et console restées accessibles selon l’éditeur.",
  tungsten: "Flux Europe relu le 16 octobre. Le traitement des factures françaises revient à un niveau normal le 14, avec rattrapage et surveillance toujours en cours. Une résolution finale reste à confirmer. Les avis KSeF Pologne et Printix restent hors du journal faute de périmètre français de facturation documenté.",
  "pitney-bowes": "Flux public relu : les avis d’octobre concernent les API d’expédition et les transporteurs. Leur impact sur la PA française reste à documenter.",
  tiime: "API publique consultée : liste d’événements vide dans la fenêtre de 30 jours fournie par l’éditeur.",
  ademico: "API publique consultée : liste d’événements vide dans la fenêtre de 30 jours fournie par l’éditeur.",
};
export const incidentCoverage = [
  ...initialIncidentCoverage,
  ...incidentFeeds.filter(feed => feed.platformSlugs.length && !initialIncidentCoverage.some(item => feed.platformSlugs.includes(item.platformSlug))).flatMap(feed => feed.platformSlugs.map(platformSlug => ({
    platformSlug, sourceIds: [feed.sourceId], checkedAt: feed.checkedAt, status: "partial" as const,
    note: feedNotes[platformSlug] ?? "Flux officiel relu le 16 octobre. Les publications disponibles portent sur les services de l’éditeur ; la profondeur historique dépend du flux fourni.",
  }))),
  {"platformSlug": "aruba", "sourceIds": ["aruba-manual-status-2026-09"], "checkedAt": "2026-10-16", "status": "partial", "note": "Page d’alertes relue le 16 octobre. Les avis de phishing des 14 et 15 concernent de faux renouvellements de domaine. Ils ne documentent pas une compromission de la PA OneSuite France. L’historique de disponibilité de la PA reste à compléter."},
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
  checkedAt: "2026-10-16",
  status: "partial_search" as const,
  platformCount: 149,
  note: "Dernière recherche nominative complète le 10 octobre pour les 149 acteurs alors présents. La recherche générale du 16 reste à compléter. Les six nouveaux sites, les 26 sources de collecte et les sources des avis déjà publiés ont été relus. Les qualifications des six avis de sécurité sont conservées. Les correctifs SAP du 13 sont présentés comme vulnérabilités de produits, hors compteur des incidents. Le bandeau AIFE de reprise reste absent ; la fin de surveillance demeure non précisée. L’investigation chez le prestataire de VosFactures conserve son périmètre distinct.",
  sourceIds: ["axonaut-claim-20260629", "fiducial-security-20261001", "aife-vosfactures-reprise-20261004", "aife-vosfactures-20261002", "factuali-notification-relayed-20261001", "fuitesinfos-vosfactures-20261001", "fakturownia-security-20260929", "cert-fr-sap-20260908", "cert-fr-sap-20261013", "sap-patch-day-20261013", "blg-security-20260810", "frenchbreaches-welyb-20260915", "welyb-cecurity-integration", "frenchbreaches-zenfirst-20260917", "zenfirst-integration-20260920", "frenchbreaches-altagem-20260921", "altagem-iopole-integration-20260923", "frenchbreaches-faktus-20260919", "faktus-financement-20260923"],
  findings: [
    { platformSlug: "axonaut", type: "outside_period" as const, title: "Clients Axonaut : revendication publiée en juin", note: "FrenchBreaches rapporte le 29 juin une revendication de documents attribués à huit entreprises clientes d’Axonaut. L’authenticité, le point d’accès et une compromission de l’éditeur restent à confirmer. La publication est antérieure au 1er septembre et reste hors du journal de la période.", sourceIds: ["axonaut-claim-20260629"] },
    { platformSlug: "sap", type: "vulnerability_advisory" as const, title: "SAP : correctifs de sécurité d’octobre", note: "Le CERT-FR publie le 13 octobre un avis sur plusieurs produits SAP. Le Patch Day de l’éditeur décrit les correctifs de différents composants, dont Cloud Connector, NetWeaver et S/4HANA. L’impact sur la PA française doit être documenté séparément ; ces bulletins restent hors du compteur des incidents.", sourceIds: ["cert-fr-sap-20261013", "sap-patch-day-20261013"] },
    { platformSlug: "blg", type: "outside_period" as const, title: "blgCloud : notification antérieure à la période", note: "La notification officielle du 10 août décrit une attaque de juillet. Elle est conservée comme contexte et exclue du compteur des incidents de septembre. Le suivi des publications conserve cet incident de juillet hors du compteur de la période.", sourceIds: ["blg-security-20260810"] },
  ],
};
export function incidentsForPlatform(slug: string) {
  const research = incidentResearch.find(item => item.platformSlug === slug);
  return {
    since: INCIDENT_WATCH_SINCE,
    coverage: incidentCoverage.find(item => item.platformSlug === slug) ?? { platformSlug: slug, status: "not_reviewed", checkedAt: null, sourceIds: [], note: "Historique de disponibilité non documenté dans les sources retenues." },
    incidents: platformIncidents.filter(event => event.platformSlugs.includes(slug)),
    limit: incidentWatchLimit,
    security: { ...research, status: research?.status === "searched" ? "public_search_completed" : research?.status === "public_sites_reviewed" ? "partial_search" : "not_reviewed" },
    feeds: incidentFeeds.filter(feed => feed.platformSlugs.includes(slug)),
  };
}
export function incidentWatchCorpus() {
  const sourceIds = new Set([...platformIncidents.flatMap(event => [...event.sourceIds, ...(event.relationship?.sourceIds ?? [])]), ...incidentCoverage.flatMap(item => [...item.sourceIds]), ...incidentFeeds.map(feed => feed.sourceId), ...securityReview.sourceIds]);
  return { schemaVersion: "2.2", since: INCIDENT_WATCH_SINCE, checkedAt: INCIDENT_WATCH_CHECKED_AT, limit: incidentWatchLimit, securityReview, research: incidentResearch, collection: { intervalMinutes: 1440, publication: "reviewed", feeds: incidentFeeds }, coverage: platforms.map(platform => incidentsForPlatform(platform.slug).coverage), incidents: platformIncidents, sources: sources.filter(source => sourceIds.has(source.id)) };
}
