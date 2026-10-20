import { z } from "zod";
import rawIncidents from "./platform-incidents.json" with { type: "json" };
import sources from "./sources.json" with { type: "json" };
import { platforms } from "./platforms.ts";
import rawFeeds from "./incident-watch-sources.json" with { type: "json" };
import rawResearch from "./incident-research.json" with { type: "json" };
import { incidentDateAfter } from "../lib/incident-dates.ts";

export const INCIDENT_WATCH_SINCE = "2026-09-01";
export const INCIDENT_WATCH_CHECKED_AT = "2026-10-20";
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
  { platformSlug: "vosfactures", sourceIds: ["aife-vosfactures-reprise-20261004", "aife-vosfactures-20261002"], checkedAt: "2026-10-20", status: "partial", note: "Portail AIFE rendu et annonces développées le 20 octobre : les trois annonces visibles restent celles déjà observées le 16 ; le bandeau de reprise reste absent. La date de reprise et la fin de surveillance demeurent inconnues. L’investigation chez le prestataire conserve son périmètre distinct." },
  { platformSlug: "jefacture", sourceIds: ["welyb-status-20260916"], checkedAt: "2026-10-20", status: "partial", note: "Welyb confirme toujours le rétablissement de la modification des statuts annoncé le 16 octobre. L’avis initial, sans date propre, a été observé le 30 septembre. Le service connecté reste distinct de la PA." },
  { platformSlug: "cecurity", sourceIds: ["welyb-status-20260916"], checkedAt: "2026-10-20", status: "partial", note: "Le raccordement des nouveaux dossiers reste rétabli selon le complément du 16. La récupération de certaines factures dans Welyb reste dans les perturbations lors de la relecture du 20 ; les deux fonctions demeurent distinctes." },
  { platformSlug: "sage", sourceIds: ["sage-status-2026-09", "sage-onboarding-20261010", "sage-help-fr-20261020"], checkedAt: "2026-10-20", status: "reviewed", note: "L’envoi des factures françaises reste rétabli depuis la clôture annoncée le 14. Un nouvel avis du 20 concerne le centre d’aide français de plusieurs produits, dont Sage eFacture, avec état identifié. Les pages d’aide restent distinctes des applications et des flux PA. L’alerte d’onboarding du 10 reste exclue : Sage y décrit des comptes incomplètement configurés." },
  { platformSlug: "pennylane", sourceIds: ["pennylane-status-2026-09"], checkedAt: "2026-10-20", status: "reviewed", note: "Flux et avis relus le 20 octobre. La perturbation de l’application du 25 septembre reste résolue ; son impact sur les flux PA demeure non documenté." },
  { platformSlug: "qonto", sourceIds: ["qonto-status-20261008", "qonto-status-2026-09"], checkedAt: "2026-10-20", status: "partial", note: "Historique d’octobre relu le 20 octobre : la page affiche une liste vide. La disponibilité de la PA et des services bancaires reste à vérifier séparément." },
  { platformSlug: "esker", sourceIds: ["esker-status-2026-09"], checkedAt: "2026-10-20", status: "partial", note: "Pages relues le 20 octobre. Les messages d’affichage D, E, G et K restent absents après les compléments des 12 et 13 annonçant un script correctif. L’état final demeure inconnu. L’environnement L de la PA française n’était pas cité." },
  { platformSlug: "sellsy", sourceIds: ["sellsy-status-2026-09"], checkedAt: "2026-10-20", status: "partial", note: "La page courante est accessible le 20 octobre et affiche les services de l’application, de l’API et de l’aide. L’historique depuis le 1er septembre et le périmètre de la PA française restent à documenter." },
  { platformSlug: "dext", sourceIds: ["dext-status-2026-09"], checkedAt: "2026-10-20", status: "partial", note: "Le rapport HTTP Dext Prepare Web App est consulté le 20 octobre. Il couvre la fenêtre des sept derniers jours pour cette application ; l’historique de septembre et le périmètre PA français restent à documenter." },
] as const;
const feedNotes: Record<string, string> = {
  veryswing: "Flux et deux avis du 14 octobre relus le 20. Un seul incident d’analyse documentaire est retenu. Veryswing corrige son attribution initiale à Mindee et identifie un traitement interne bloqué, rétabli le 14 à 15 h 35 Paris. Le périmètre PA reste non documenté.",
  lucca: "Flux et avis du 28 septembre relus le 20 octobre. Perturbation de certaines applications résolue ; impact sur les flux PA non précisé.",
  docoon: "Un avis du 19 décrit l’interruption puis le rétablissement de la plateforme de gestion du support. L’impact sur la facturation électronique reste non documenté.",
  superpdp: "Flux relu le 20 octobre, après les précédentes lectures de la page. Incident de chargement de l’annuaire du 18 septembre publié, avec résolution annoncée. Horaires limités au jour en raison des fuseaux contradictoires.",
  weproc: "Flux et avis WeInvoice relus le 20 octobre. Les sept alertes PISTE du 3 octobre sont regroupées ; une nouvelle alerte du 7 est ajoutée. Toutes annoncent une résolution. Leur auteur reste WeInvoice ; la cause générale côté annuaire demeure à confirmer.",
  spendesk: "Flux et avis relus le 20 octobre. Un avis publié le 15 annonce une réception de factures électroniques rétablie la veille ; pays et PA ne sont pas précisés. L’avis 3DS iOS reste identifié, avec correctif en préparation chez un prestataire non nommé. Les rétablissements antérieurs des factures françaises et cartes Amazon restent documentés séparément.",
  myunisoft: "Calendrier et pages relus le 20 octobre. Les deux notifications de connexion du 2 octobre annoncent la résolution le 5. Ajout de Datalake et de la saisie des temps, avec résolutions le 6. Les dates des pages sont conservées au jour près faute de fuseau explicite.",
  dokapi: "Flux et avis du 16 septembre relus. La perturbation publiée concerne l’envoi des e-mails.",
  invopop: "Flux et avis relus. Le compte rendu du 3 octobre confirme un incident de traitement et téléchargement de documents, dont les intégrations France, rétabli le même jour. API et console restées accessibles selon l’éditeur.",
  tungsten: "L’avis français est clôturé le 19 octobre, après un traitement revenu à un niveau normal depuis le matin du 14 selon l’éditeur. Le rapprochement de certaines transactions reste mentionné. Les périmètres Printix et Pologne sont distincts.",
  "pitney-bowes": "Flux public relu : les avis d’octobre concernent les API d’expédition et les transporteurs. Leur impact sur la PA française reste à documenter.",
  tiime: "API publique consultée : liste d’événements vide dans la fenêtre de 30 jours fournie par l’éditeur.",
  ademico: "API publique consultée : liste d’événements vide dans la fenêtre de 30 jours fournie par l’éditeur.",
};
export const incidentCoverage = [
  ...initialIncidentCoverage,
  ...incidentFeeds.filter(feed => feed.platformSlugs.length && !initialIncidentCoverage.some(item => feed.platformSlugs.includes(item.platformSlug))).flatMap(feed => feed.platformSlugs.map(platformSlug => ({
    platformSlug, sourceIds: [feed.sourceId], checkedAt: feed.checkedAt, status: "partial" as const,
    note: feedNotes[platformSlug] ?? "Flux officiel relu le 20 octobre. Les publications disponibles portent sur les services de l’éditeur ; la profondeur historique dépend du flux fourni.",
  }))),
  {"platformSlug": "aruba", "sourceIds": ["aruba-manual-status-2026-09"], "checkedAt": "2026-10-16", "status": "partial", "note": "Page d’alertes relue le 16 octobre. Les avis de phishing des 14 et 15 concernent de faux renouvellements de domaine. Ils ne documentent pas une compromission de la PA OneSuite France. L’historique de disponibilité de la PA reste à compléter."},
  {"platformSlug": "docuware", "sourceIds": ["docuware-manual-status-2026-09"], "checkedAt": "2026-10-20", "status": "partial", "note": "Portail d’état relu le 20 octobre. La réponse HTML contient seulement le titre du service ; l’historique public exige une lecture du portail interactif."},
  {"platformSlug": "iopole", "sourceIds": ["iopole-manual-status-2026-09"], "checkedAt": "2026-10-20", "status": "partial", "note": "Page de suivi de l’API relue le 20 octobre. La capture HTML ne restitue pas les événements chargés dynamiquement ; la chronologie demeure à vérifier."},
  {"platformSlug": "mysupply", "sourceIds": ["mysupply-manual-status-2026-09"], "checkedAt": "2026-10-20", "status": "partial", "note": "L’ancienne page de disponibilité redirige le 20 octobre vers la page de contact Inexchange. Cette destination ne fournit pas l’historique des incidents de mySupply ou de sa PA française."},
  {"platformSlug": "odoo", "sourceIds": ["odoo-manual-status-2026-09"], "checkedAt": "2026-09-16", "status": "partial", "note": "Page d’état consultée. Le contenu extrait mêle des exemples et des événements anciens ; il est insuffisant pour établir un historique fiable de septembre."},
  {"platformSlug": "pagero", "sourceIds": ["pagero-manual-status-2026-09", "pagero-online-20261009"], "checkedAt": "2026-10-20", "status": "partial", "note": "Le contrôle manuel du 20 retrouve un incident Pagero Online du 9 octobre, résolu le même jour. Le périmètre français de la PA reste non précisé. Les maintenances Chorus Pro et Health Solutions sont séparées. Le lien RSS redirige vers inactive.rss ; le suivi reste manuel et la profondeur historique demeure partielle."},
  {"platformSlug": "sovos", "sourceIds": ["sovos-manual-status-2026-09"], "checkedAt": "2026-10-20", "status": "partial", "note": "Le portail relu le 20 octobre répartit les services par région. La réponse HTML ne restitue pas les avis européens ; un raccordement propre à ce périmètre reste à confirmer."},
  { platformSlug: "atgp", sourceIds: ["atgp-status-2026-09"], checkedAt: "2026-10-20", status: "partial" as const, note: "La page ATGP relue le 20 octobre affiche Aucune anomalie recensée actuellement. Cette vue courante ne fournit pas la chronologie depuis le 1er septembre." },
];
export const incidentWatchLimit = "Ce journal réunit les avis des éditeurs, les notifications relayées et les revendications à confirmer. Chaque signalement précise son niveau de confirmation et le service concerné. Certains avis se recoupent. La couverture reste partielle ; l’évaluation de la disponibilité et de la sécurité exige aussi des mesures techniques et des audits.";
export const securityReview = {
  checkedAt: "2026-10-20",
  status: "partial_search" as const,
  platformCount: 149,
  note: "Dernière recherche nominative complète le 10 octobre pour les 149 acteurs alors présents. La recherche générale du 20 reste partielle. Les accueils officiels des 155 acteurs ont été examinés avec les refus et limites de contenu consignés dans la revue ; les 26 sources de collecte et les avis déjà publiés ont été relus. Les six qualifications de sécurité sont conservées. Les huit nouvelles publications CERT-FR ne documentent pas ici de nouvel incident de PA. La fin de surveillance AIFE demeure non précisée ; le suivi de VosFactures conserve son périmètre propre.",
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
