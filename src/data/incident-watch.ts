import { z } from "zod";
import rawIncidents from "./platform-incidents.json" with { type: "json" };
import sources from "./sources.json" with { type: "json" };
import { platforms } from "./platforms.ts";

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

// A reviewed public page does not establish full historical or PA coverage.
export const incidentCoverage = [
  { platformSlug: "sage", sourceIds: ["sage-status-2026-09"], checkedAt: "2026-09-16", status: "reviewed", note: "Historique public du 1er au 16 septembre : avis de facturation française et services citant la France. Autres pays et maintenances exclus." },
  { platformSlug: "pennylane", sourceIds: ["pennylane-status-2026-09"], checkedAt: "2026-09-16", status: "reviewed", note: "Historique public du 1er au 16 septembre relu. Les avis portent sur l’application. Leur impact éventuel sur les flux PA reste à documenter." },
  { platformSlug: "qonto", sourceIds: ["qonto-status-2026-09"], checkedAt: "2026-09-16", status: "reviewed", note: "L’historique officiel de septembre était vide lors du contrôle. La disponibilité de la PA et des services bancaires reste à vérifier séparément." },
  { platformSlug: "esker", sourceIds: ["esker-status-2026-09"], checkedAt: "2026-09-16", status: "partial", note: "Revue des avis affichés par environnement, dont celui concernant l’environnement G. L’historique depuis le 1er septembre reste à compléter." },
  { platformSlug: "sellsy", sourceIds: ["sellsy-status-2026-09"], checkedAt: "2026-09-16", status: "partial", note: "État courant consulté. L’historique depuis le 1er septembre et la disponibilité de la PA restent à documenter. Le site refuse notre collecte automatique." },
  { platformSlug: "dext", sourceIds: ["dext-status-2026-09"], checkedAt: "2026-09-16", status: "partial", note: "Le rapport HTTP de Dext Prepare couvre une partie de la période. Un suivi propre à la PA française reste à documenter." },
] as const;
export const incidentWatchLimit = "Ce journal repose sur les communications des éditeurs. Certains avis concernent le même incident. Leur nombre reflète les informations publiées, avec une couverture variable selon les plateformes. L’évaluation de la disponibilité et de la sécurité exige aussi des mesures techniques et des audits.";
export const securityReview = {
  checkedAt: "2026-09-16",
  status: "partial" as const,
  note: "La première recherche porte sur Sage, Pennylane, Qonto, Cegid, Tiime, Abby, Indy, Sellsy, Doxallia, SuperPDP, Esker et Yooz, ainsi que sur les publications CERT-FR. À ce stade, les éléments recueillis restent insuffisants pour confirmer un incident de sécurité. La couverture des 149 PA reste à compléter.",
};
export function incidentsForPlatform(slug: string) {
  return {
    since: INCIDENT_WATCH_SINCE,
    coverage: incidentCoverage.find(item => item.platformSlug === slug) ?? { platformSlug: slug, status: "not_reviewed", checkedAt: null, sourceIds: [], note: "Cette fiche attend une revue de son historique d’incidents." },
    incidents: platformIncidents.filter(event => event.platformSlugs.includes(slug)),
    limit: incidentWatchLimit,
    security: { status: "not_established", note: "L’évaluation de sécurité de cette plateforme reste à établir." },
  };
}
export function incidentWatchCorpus() {
  const sourceIds = new Set([...platformIncidents.flatMap(event => event.sourceIds), ...incidentCoverage.flatMap(item => [...item.sourceIds])]);
  return { schemaVersion: "1.0", since: INCIDENT_WATCH_SINCE, checkedAt: INCIDENT_WATCH_CHECKED_AT, limit: incidentWatchLimit, securityReview, coverage: platforms.map(platform => incidentsForPlatform(platform.slug).coverage), incidents: platformIncidents, sources: sources.filter(source => sourceIds.has(source.id)) };
}
