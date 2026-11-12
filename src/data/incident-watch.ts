import { z } from "zod";
import rawIncidents from "./platform-incidents.json" with { type: "json" };
import sources from "./sources.json" with { type: "json" };
import { platforms } from "./platforms.ts";
import rawFeeds from "./incident-watch-sources.json" with { type: "json" };
import rawResearch from "./incident-research.json" with { type: "json" };
import { incidentDateAfter } from "../lib/incident-dates.ts";

export const INCIDENT_WATCH_SINCE = "2026-09-01";
export const INCIDENT_WATCH_CHECKED_AT = "2026-11-12";
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
  kind: z.enum(["rss", "atom", "json", "esker", "html"]),
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
  {"platformSlug": "spendesk", "sourceIds": ["spendesk-watch-2026-09", "spendesk-3ds-20261007", "spendesk-3ds-resolution-20261101", "spendesk-w7sbfw2qjzpt"], "checkedAt": "2026-11-01", "status": "partial", "note": "Notifications 3DS iOS annoncées rétablies le 23 octobre. Détails des cartes d’abonnement rétablis le 29. Ces services de paiement restent distincts des flux de facturation électronique."},
  { platformSlug: "vosfactures", sourceIds: ["aife-vosfactures-reprise-20261004", "aife-vosfactures-20261002"], checkedAt: "2026-10-22", status: "partial", note: "Portail AIFE rendu et annonces développées le 22 octobre : deux annonces visibles portent sur les évolutions B2G et l’authentification. Les anciens bandeaux VosFactures et dépôt PDF sont absents. La date de reprise et la fin de surveillance demeurent inconnues. L’investigation chez le prestataire conserve son périmètre distinct." },
  {"platformSlug": "jefacture", "sourceIds": ["welyb-status-20260916", "welyb-status-20261101"], "checkedAt": "2026-11-01", "status": "partial", "note": "Welyb conserve le rétablissement des modifications de statuts annoncé le 16 octobre. Le connecteur reste distinct de l’infrastructure de la PA."},
  {"platformSlug": "cecurity", "sourceIds": ["welyb-status-20260916", "welyb-status-20261101"], "checkedAt": "2026-11-01", "status": "partial", "note": "La récupération de certaines factures eFacture dans Welyb reste perturbée sur la page actualisée le 30 octobre. Le raccordement des nouveaux dossiers conserve son rétablissement annoncé le 16. Les deux fonctions sont distinctes."},
  {"platformSlug": "sage", "sourceIds": ["sage-status-2026-09", "sage-onboarding-20261010", "sage-help-fr-20261020", "sage-efacture-archivage-20261020"], "checkedAt": "2026-11-01", "status": "partial", "note": "Avis et flux relus le 1er novembre. FRP 1000 France et Ciel Données Mobiles annoncent leur rétablissement les 27 et 28 octobre ; l’accès Intacct Europe est rétabli le 30. Le bandeau eFacture ancien garde son état inconnu. L’alerte d’onboarding du 10 octobre reste exclue : Sage l’attribue à des comptes incomplètement configurés. Les services et les flux PA restent distingués."},
  { platformSlug: "pennylane", sourceIds: ["pennylane-status-2026-09"], checkedAt: "2026-10-22", status: "reviewed", note: "Flux et avis relus le 22 octobre. La perturbation de l’application du 25 septembre reste résolue ; son impact sur les flux PA demeure non documenté." },
  { platformSlug: "qonto", sourceIds: ["qonto-status-20261008", "qonto-status-2026-09"], checkedAt: "2026-10-20", status: "partial", note: "Historique d’octobre relu le 20 octobre : la page affiche une liste vide. La disponibilité de la PA et des services bancaires reste à vérifier séparément." },
  {"platformSlug": "esker", "sourceIds": ["esker-status-2026-09", "ar24-completion-20261101"], "checkedAt": "2026-11-01", "status": "partial", "note": "Les avis retirés conservent leurs dates de fin inconnues. AR24 annonce la fin de maintenance le 22 octobre pour les lettres recommandées électroniques ; le périmètre Esker français L reste distinct."},
  { platformSlug: "sellsy", sourceIds: ["sellsy-status-2026-09"], checkedAt: "2026-10-20", status: "partial", note: "La page courante est accessible le 20 octobre et affiche les services de l’application, de l’API et de l’aide. L’historique depuis le 1er septembre et le périmètre de la PA française restent à documenter." },
  { platformSlug: "dext", sourceIds: ["dext-status-2026-09"], checkedAt: "2026-10-20", status: "partial", note: "Le rapport HTTP Dext Prepare Web App est consulté le 20 octobre. Il couvre la fenêtre des sept derniers jours pour cette application ; l’historique de septembre et le périmètre PA français restent à documenter." },
  { platformSlug: "sps-commerce", sourceIds: ["sps-status-20261020", "sps-fulfillment-20261012", "sps-fulfillment-product-20261020"], checkedAt: "2026-10-22", status: "partial", note: "Flux public relu le 20 octobre. L’avis Fulfillment du 12 annonce le rétablissement de la consultation, de l’ouverture et de l’envoi des documents. Le traitement et les flux de données sont restés normaux selon l’éditeur. Le produit traite notamment des factures ; l’avis ne précise pas les types de documents touchés, les pays ou un impact sur la PA française. Les maintenances planifiées restent séparées." },
] as const;
const feedNotes: Record<string, string> = {
  "ecosio-intercom": "La transmission Flow1 cite E-invoice - France dans l’avis du 1er novembre. L’investigation reste ouverte, sans reprise datée publiée.",
  "eezi": "L’avis FRA AP des 28 au 30 octobre cite le composant France et annonce la résolution. Le lien exact avec les flux de la PA française reste à documenter.",
  "swile": "Le RSS public est lié depuis la page d’état. Les avis disponibles restent distincts d’une mesure de disponibilité de la PA ; la profondeur du flux et les composants couverts limitent ce contrôle.",
  veryswing: "La page d’historique remplace le flux Atom devenu introuvable. Le 29 octobre, Veryswing annonce la réplication VSDB redémarrée mais encore sujette à interruptions ; le service PA est affiché opérationnel. Le correctif PHP du 21 est annoncé sans interruption de service.",
  lucca: "Trois avis des 22, 26 et 29 octobre sont annoncés rétablis. Le dernier attribue la cause aux équilibreurs de charge du fournisseur cloud. Le périmètre des flux PA reste non précisé.",
  docoon: "Un avis du 19 décrit l’interruption puis le rétablissement de la plateforme de gestion du support. L’impact sur la facturation électronique reste non documenté.",
  superpdp: "Les trois messages réseau/API du 30 octobre sont regroupés avec rétablissement annoncé. Les heures contradictoires de la page et du RSS restent au jour près.",
  weproc: "Un nouvel avis sur les appels PISTE du 29 octobre annonce le rétablissement. Il décrit le trafic de WeInvoice, sans établir une panne générale de toutes les PA.",
  spendesk: "Flux et avis relus le 22 octobre. Un avis publié le 15 annonce une réception de factures électroniques rétablie la veille ; pays et PA ne sont pas précisés. L’avis 3DS iOS reste identifié, avec correctif en préparation chez un prestataire non nommé. Les rétablissements antérieurs des factures françaises et cartes Amazon restent documentés séparément.",
  myunisoft: "Calendrier et pages relus le 22 octobre. Les deux notifications de connexion du 2 octobre annoncent la résolution le 5. Ajout de Datalake et de la saisie des temps, avec résolutions le 6. Les dates des pages sont conservées au jour près faute de fuseau explicite.",
  dokapi: "Flux et avis du 16 septembre relus. La perturbation publiée concerne l’envoi des e-mails.",
  invopop: "Flux et avis relus. Le compte rendu du 3 octobre confirme un incident de traitement et téléchargement de documents, dont les intégrations France, rétabli le même jour. API et console restées accessibles selon l’éditeur.",
  tungsten: "L’avis français est clôturé le 19 octobre, après un traitement revenu à un niveau normal depuis le matin du 14 selon l’éditeur. Le rapprochement de certaines transactions reste mentionné. Les périmètres Printix et Pologne sont distincts.",
  "pitney-bowes": "Flux public relu : les avis d’octobre concernent les API d’expédition et les transporteurs. Leur impact sur la PA française reste à documenter.",
  tiime: "API publique consultée : liste d’événements vide dans la fenêtre de 30 jours fournie par l’éditeur.",
  ademico: "API publique consultée : liste d’événements vide dans la fenêtre de 30 jours fournie par l’éditeur.",
};
const novemberCoverage: Record<string, { platformSlug: string; sourceIds: string[]; checkedAt: string; status: "partial" | "reviewed"; note: string }> = {
  "avalara": {
    "platformSlug": "avalara",
    "sourceIds": [
      "avalara-watch-2026-09"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "Flux ou API officiels relus le 12 novembre. La fenêtre disponible et les composants publiés limitent ce suivi ; les flux PA français sont qualifiés séparément."
  },
  "axway": {
    "platformSlug": "axway",
    "sourceIds": [
      "axway-watch-2026-09"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "Le nouvel avis du 4 novembre concerne le plan de contrôle Amplify Fusion aux États-Unis, avec données de traitement actives selon Axway. Il reste exclu du périmètre PA France. Les maintenances planifiées restent séparées."
  },
  "blg": {
    "platformSlug": "blg",
    "sourceIds": [
      "blg-watch-2026-09",
      "blg-security-20260910"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "Le flux de disponibilité est relu. Le communiqué du 10 septembre est ajouté comme suivi d’une exfiltration de l’été sur l’ERP, avec portée PA non établie."
  },
  "docoon": {
    "platformSlug": "docoon",
    "sourceIds": [
      "docoon-invoice-watch-20260920"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "Flux ou API officiels relus le 12 novembre. La fenêtre disponible et les composants publiés limitent ce suivi ; les flux PA français sont qualifiés séparément."
  },
  "dokapi": {
    "platformSlug": "dokapi",
    "sourceIds": [
      "dokapi-watch-2026-09"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "Flux ou API officiels relus le 12 novembre. La fenêtre disponible et les composants publiés limitent ce suivi ; les flux PA français sont qualifiés séparément."
  },
  "ecosio-intercom": {
    "platformSlug": "ecosio-intercom",
    "sourceIds": [
      "ecosio-intercom-watch-2026-09",
      "ecosio-intercom-01m6b6e5mvdhptvw16rghsvbsv"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "La reprise Flow1 en France et le renvoi de tous les messages sont annoncés le 2 novembre à 09 h 40 UTC."
  },
  "eezi": {
    "platformSlug": "eezi",
    "sourceIds": [
      "eezi-watch-2026-09"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "Flux ou API officiels relus le 12 novembre. La fenêtre disponible et les composants publiés limitent ce suivi ; les flux PA français sont qualifiés séparément."
  },
  "ademico": {
    "platformSlug": "ademico",
    "sourceIds": [
      "ademico-watch-2026-09"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "API officielle relue le 12 novembre. Aucun événement retourné dans la fenêtre publiée ; les avis privés et les événements hors fenêtre restent inconnus."
  },
  "abby": {
    "platformSlug": "abby",
    "sourceIds": [
      "abby-status-20261112"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "La page officielle lie un flux RSS vide, avec date de canal ancienne de 2022. Elle couvre Website, App et Api, sans composant PA explicite. L’absence d’éléments ne fournit pas l’historique depuis septembre."
  },
  "docuware": {
    "platformSlug": "docuware",
    "sourceIds": [
      "docuware-status-20261112",
      "docuware-test-20261105"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "Historique rendu sur trente jours relu. L’avis du 5 novembre est explicitement un test à ignorer ; ceux d’Australie et des États-Unis gardent leur périmètre étranger. Le visualiseur EMEA du 21 octobre reste annoncé résolu."
  },
  "dext": {
    "platformSlug": "dext",
    "sourceIds": [
      "dext-status-20261112"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "Rapport HTTP Dext Prepare Web App relu le 12 novembre, fenêtre du 6 au 12 affichée opérationnelle. Ce contrôle applicatif sur sept jours ne fournit pas l’historique de disponibilité de la PA depuis septembre."
  },
  "aruba": {
    "platformSlug": "aruba",
    "sourceIds": [
      "aruba-manual-status-2026-09",
      "aruba-phishing-20261109"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "Alerte du 9 novembre relue : faux courriel de renouvellement de domaine. Ce phishing externe ne documente pas une compromission de la PA OneSuite France. L’onglet des alertes de service est vide lors de la lecture."
  },
  "atgp": {
    "platformSlug": "atgp",
    "sourceIds": [
      "atgp-status-20261112",
      "atgp-beefact-20261022",
      "atgp-final-20261101"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "La page courante indique aucune anomalie recensée et a retiré les messages d’octobre. L’annonce historique de rétablissement du 22 octobre est conservée ; son retrait ne change pas les dates ou la portée de l’avis."
  },
  "fulll": {
    "platformSlug": "fulll",
    "sourceIds": [
      "fulll-incident-1112385-20261112",
      "fulll-incident-1115547-20261112",
      "fulll-incident-1116653-20261112",
      "fulll-incident-1116679-20261112",
      "fulll-incident-1119878-20261112",
      "fulll-incident-1120747-20261112"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "Six pages primaires de novembre relues, regroupées en cinq événements après rapprochement des deux avis d’accès du 5 novembre. La PA est nommée dans les avis des 9 et 10, avec des reprises distinctes du portail et des autres applications. La maintenance planifiée du 5 reste hors compteur."
  },
  "pagero": {
    "platformSlug": "pagero",
    "sourceIds": [
      "pagero-delivery-rbhs8s3vcrnq-20261112",
      "pagero-clearance-tmcf9ljd0z83-20261112"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "Reprise des envois PPF le 2 novembre puis rattrapage complet du flux clearance français annoncé le 6. Les deux avis liés sont regroupés pour suivre le même épisode. Les avis EU1/Pologne, bancaires suédois et les maintenances annoncées restent hors compteur français."
  },
  "lucca": {
    "platformSlug": "lucca",
    "sourceIds": [
      "lucca-zhgqxpryvyj6-20261112",
      "lucca-watch-2026-09"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "Flux et avis du 3 novembre relus : applications OVH Limburg EU2 annoncées rétablies. Le périmètre des flux de facturation électronique reste non précisé."
  },
  "esker": {
    "platformSlug": "esker",
    "sourceIds": [
      "esker-status-2026-09",
      "esker-peppol-20261029-20261112"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "Page courante et capture indexée relues. Le message primaire du 29 octobre décrit une interruption Peppol et des factures en échec, sans reprise de leur traitement confirmée. Le signal d’un moniteur tiers le 9 novembre reste à confirmer faute d’historique primaire accessible."
  },
  "pennylane": {
    "platformSlug": "pennylane",
    "sourceIds": [
      "pennylane-hn2l065z54hr-20261112"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "L’avis primaire du 10 novembre est relu : application rétablie. L’effet sur les transmissions PA reste à préciser."
  },
  "sage": {
    "platformSlug": "sage",
    "sourceIds": [
      "sage-8bsqk0rjwpg9-20261112",
      "sage-jd8s1rx86v5q-20261112",
      "sage-efacture-observation-20261112"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "Le menu de facturation électronique français et la synchronisation AutoEntry sont documentés séparément. L’ancien bandeau d’archivage est absent ; aucune résolution datée n’est retrouvée pour cet avis. L’alerte d’onboarding d’octobre reste exclue : Sage l’attribue à des comptes incomplètement configurés."
  },
  "spendesk": {
    "platformSlug": "spendesk",
    "sourceIds": [
      "spendesk-5q8bzzg6ck1j-20261112"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "Authentification SMS et vérifications fortes rétablies le 3 novembre. La source décrit une perturbation de disponibilité, sans violation de données signalée."
  },
  "superpdp": {
    "platformSlug": "superpdp",
    "sourceIds": [
      "superpdp-errors-20261105-20261112"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "L’alerte sur les erreurs 500 du 5 novembre conserve son message d’analyse. Le statut courant de l’API est opérationnel, sans résolution datée de cet avis. Les heures page/RSS contradictoires sont conservées au jour près."
  },
  "sps-commerce": {
    "platformSlug": "sps-commerce",
    "sourceIds": [
      "sps-0l1110y8gs76-20261112"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "Le traitement des documents est annoncé rétabli le 9 novembre. Les types de documents et le périmètre français restent inconnus."
  },
  "veryswing": {
    "platformSlug": "veryswing",
    "sourceIds": [
      "veryswing-201-resolution-20261112"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "Les commentaires VSDB signalent encore des interruptions le 2 novembre, puis une résolution le 5 novembre. Le composant de facturation électronique est affiché opérationnel."
  },
  "pitney-bowes": {
    "platformSlug": "pitney-bowes",
    "sourceIds": [
      "pitney-bowes-watch-2026-09"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "Les avis de novembre sur UPS et FedEx visent RateShipment et les services d’expédition. Leur effet sur la PA française reste non documenté."
  },
  "storecove": {
    "platformSlug": "storecove",
    "sourceIds": [
      "storecove-watch-2026-09"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "Flux public collecté : aucun nouvel avis depuis le 1er novembre dans la fenêtre disponible. Sa profondeur historique et le périmètre de la PA française restent à distinguer."
  },
  "tiime": {
    "platformSlug": "tiime",
    "sourceIds": [
      "tiime-watch-2026-09"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "L’API publique des événements renvoie une liste vide dans sa fenêtre glissante du 13 octobre au 12 novembre. Ce relevé ne constitue pas une mesure de disponibilité de la PA."
  },
  "swile": {
    "platformSlug": "swile",
    "sourceIds": [
      "swile-status-20261101"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "Le RSS est collecté et la page publique consultée. La fenêtre récente reste sans avis. Les composants paiements, avantages et déplacements restent distincts du périmètre de la PA."
  },
  "tungsten": {
    "platformSlug": "tungsten",
    "sourceIds": [
      "tungsten-watch-2026-09"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "Le flux EMEA est relu. Le nouvel avis TotalAgility et l’avis sur trois pays étrangers restent hors compteur faute de périmètre français de facturation établi. L’ancien avis France reste clôturé."
  },
  "cecurity": {
    "platformSlug": "cecurity",
    "sourceIds": [
      "welyb-status-20261112"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "La page Welyb conserve sa mise à jour du 30 octobre : récupération de certaines factures eFacture encore perturbée ; raccordement des nouveaux dossiers annoncé rétabli le 16 octobre. Ces avis décrivent le connecteur, sans établir une indisponibilité générale de la PA."
  },
  "jefacture": {
    "platformSlug": "jefacture",
    "sourceIds": [
      "welyb-status-20261112"
    ],
    "checkedAt": "2026-11-12",
    "status": "partial",
    "note": "La page Welyb conserve le rétablissement des modifications de statuts annoncé le 16 octobre. Le connecteur et l’infrastructure de la PA gardent leurs périmètres distincts."
  }
};
export const incidentCoverage = [
  ...initialIncidentCoverage,
  ...incidentFeeds.filter(feed => feed.platformSlugs.length && !initialIncidentCoverage.some(item => feed.platformSlugs.includes(item.platformSlug))).flatMap(feed => feed.platformSlugs.map(platformSlug => ({
    platformSlug, sourceIds: [feed.sourceId], checkedAt: feed.checkedAt, status: "partial" as const,
    note: feedNotes[platformSlug] ?? "Flux officiel relu le 1er novembre. Les publications disponibles portent sur les services de l’éditeur ; la profondeur historique dépend du flux fourni.",
  }))),
  {"platformSlug": "aruba", "sourceIds": ["aruba-manual-status-2026-09"], "checkedAt": "2026-10-16", "status": "partial", "note": "Page d’alertes relue le 16 octobre. Les avis de phishing des 14 et 15 concernent de faux renouvellements de domaine. Ils ne documentent pas une compromission de la PA OneSuite France. L’historique de disponibilité de la PA reste à compléter."},
  {"platformSlug": "docuware", "sourceIds": ["docuware-manual-status-2026-09", "docuware-viewer-emea-20261021", "docuware-ftp-emea-20261008"], "checkedAt": "2026-11-01", "status": "partial", "note": "Les pages et comptes rendus des incidents EMEA du 7/8 et du 21 octobre sont relus. Le service FTP et le chargement du visualiseur sont annoncés rétablis. Les avis Australie et États-Unis restent hors de ce suivi français."},
  {"platformSlug": "iopole", "sourceIds": ["iopole-manual-status-2026-09"], "checkedAt": "2026-10-22", "status": "partial", "note": "La réponse HTML du 22 octobre restitue le titre Iopole Api SLA et une coquille d’interface. Les événements chargés dynamiquement restent à vérifier dans le portail rendu ; aucun historique complet n’est déduit de cette lecture."},
  {"platformSlug": "mysupply", "sourceIds": ["mysupply-manual-status-2026-09"], "checkedAt": "2026-10-20", "status": "partial", "note": "L’ancienne page de disponibilité redirige le 20 octobre vers la page de contact Inexchange. Cette destination ne fournit pas l’historique des incidents de mySupply ou de sa PA française."},
  {"platformSlug": "odoo", "sourceIds": ["odoo-manual-status-2026-09"], "checkedAt": "2026-09-16", "status": "partial", "note": "Page d’état consultée. Le contenu extrait mêle des exemples et des événements anciens ; il est insuffisant pour établir un historique fiable de septembre."},
  {"platformSlug": "pagero", "sourceIds": ["pagero-manual-status-2026-09", "pagero-online-20261009", "pagero-ppf-20261101", "pagero-support-20261023"], "checkedAt": "2026-11-01", "status": "partial", "note": "Avis PPF relu le 1er novembre : transmissions suspendues, documents en file, reprise annoncée pour le 2 encore prévisionnelle. L’attribution à la passerelle PPF vient de Pagero. Le support du 23 octobre est rétabli ; le flux RSS historique reste désactivé."},
  {"platformSlug": "sovos", "sourceIds": ["sovos-manual-status-2026-09", "sovos-emea-status-20261020"], "checkedAt": "2026-10-22", "status": "partial", "note": "Le portail EMEA relu le 22 octobre affiche les composants France opérationnels lors de la lecture et un historique récent vide. Sa profondeur demeure inconnue ; ce constat ponctuel ne permet pas d’établir l’historique depuis septembre. Le suivi reste manuel."},
  {"platformSlug": "atgp", "sourceIds": ["atgp-status-2026-09", "atgp-beefact-20261022", "atgp-final-20261101"], "checkedAt": "2026-11-01", "status": "partial", "note": "@GP annonce l’ensemble des services rétabli le 22 octobre à 19 h, après l’accès BEE-FACT annoncé le matin. Les traitements EDI sont restés actifs. L’éditeur attribue l’interruption à une mesure préventive et déclare ses systèmes et données épargnés."},
  {"platformSlug": "fulll", "sourceIds": ["fulll-incident-1097346-20261101", "fulll-incident-1089867-20261101"], "checkedAt": "2026-11-01", "status": "partial", "note": "Treize pages d’incidents du 16 septembre au 31 octobre ont été relues. Douze avis sont regroupés après exclusion d’un doublon Caisse. Les messages PA des 14 et 21 octobre sont séparés des autres composants et des reprises successives."},
].map(item => {
  const update = novemberCoverage[item.platformSlug];
  return update ? { ...item, ...update, sourceIds: [...new Set([...item.sourceIds, ...update.sourceIds])] } : item;
});
for (const item of incidentCoverage) {
  if (!platforms.some(platform => platform.slug === item.platformSlug)) throw new Error(`PA de couverture inconnue : ${item.platformSlug}`);
  for (const id of item.sourceIds) {
    const source = sources.find(source => source.id === id);
    if (!source || source.accessedAt > item.checkedAt) throw new Error(`Preuve de couverture invalide : ${id}`);
  }
}
export const incidentWatchLimit = "Ce journal réunit les avis des éditeurs, les notifications relayées et les revendications à confirmer. Chaque signalement précise son niveau de confirmation et le service concerné. Certains avis se recoupent. La couverture reste partielle ; l’évaluation de la disponibilité et de la sécurité exige aussi des mesures techniques et des audits.";
export const securityReview = {
  checkedAt: "2026-11-12",
  status: "public_search_completed" as const,
  platformCount: incidentResearch.length,
  note: "Les 159 acteurs courants ont fait l’objet d’une recherche nominative au 12 novembre. Le suivi de sécurité blgCloud publié en septembre complète l’incident de l’été, avec un périmètre ERP distinct des flux PA. Les six avis déjà suivis gardent leur niveau de confirmation. Les vulnérabilités et les mesures préventives restent séparées des incidents. La portée publique de cette recherche dépend des sources accessibles.",
  sourceIds: ["tradeshift-php-notice-20261022", "axway-php-response-20261023", "axonaut-claim-20260629", "fiducial-security-20261001", "aife-vosfactures-reprise-20261004", "aife-vosfactures-20261002", "factuali-notification-relayed-20261001", "fuitesinfos-vosfactures-20261001", "fakturownia-security-20260929", "cert-fr-sap-20260908", "cert-fr-sap-20261013", "sap-patch-day-20261013", "blg-security-20260810", "frenchbreaches-welyb-20260915", "welyb-cecurity-integration", "frenchbreaches-zenfirst-20260917", "zenfirst-integration-20260920", "frenchbreaches-altagem-20260921", "altagem-iopole-integration-20260923", "frenchbreaches-faktus-20260919", "faktus-financement-20260923"],
  findings: [
    {"platformSlug": "tradeshift", "type": "vulnerability_advisory", "title": "Tradeshift : mesures préventives PHP, périmètres distingués", "note": "L’avis du 22 octobre déclare PA et Babelway non affectés, applications auxiliaires corrigées et prestataires en revue. Ces déclarations de l’éditeur ne constituent pas un nouvel incident confirmé.", "sourceIds": ["tradeshift-php-notice-20261022"]},
    {"platformSlug": "axway", "type": "vulnerability_advisory", "title": "Axway : correctifs PHP déclarés dans le cloud", "note": "Le Trust Center annonce le 23 octobre des environnements cloud corrigés. Les clients utilisant PHP dans leurs installations sont invités à vérifier les mises à jour. Cet avis préventif reste distinct d’un signalement de compromission.", "sourceIds": ["axway-php-response-20261023"]},
    { platformSlug: "axonaut", type: "outside_period" as const, title: "Clients Axonaut : revendication publiée en juin", note: "FrenchBreaches rapporte le 29 juin une revendication de documents attribués à huit entreprises clientes d’Axonaut. L’authenticité, le point d’accès et une compromission de l’éditeur restent à confirmer. La publication est antérieure au 1er septembre et reste hors du journal de la période.", sourceIds: ["axonaut-claim-20260629"] },
    { platformSlug: "sap", type: "vulnerability_advisory" as const, title: "SAP : correctifs de sécurité d’octobre", note: "Le CERT-FR publie le 13 octobre un avis sur plusieurs produits SAP. Le Patch Day de l’éditeur décrit les correctifs de différents composants, dont Cloud Connector, NetWeaver et S/4HANA. L’impact sur la PA française doit être documenté séparément ; ces bulletins restent hors du compteur des incidents.", sourceIds: ["cert-fr-sap-20261013", "sap-patch-day-20261013"] },
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
