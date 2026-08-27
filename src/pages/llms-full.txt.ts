import type { APIRoute } from "astro";
import officialDirectory from "../data/official-directory.json" with { type: "json" };
import sources from "../data/sources.json" with { type: "json" };
import { platforms } from "../data/platforms.ts";
import { researchForPlatform } from "../data/platform-research.ts";
import { publicSiteObservationForPlatform, TRACKER_OBSERVATION_SOURCE_IDS } from "../data/public-site-observations.ts";
import { practicalQuestions } from "../data/practical-questions.ts";

const sourcesById = new Map(sources.map((source) => [source.id, source]));
const linkedSources = (sourceIds: readonly string[]) => [...new Set(sourceIds)]
  .map((sourceId) => sourcesById.get(sourceId))
  .filter((source) => source !== undefined)
  .map((source) => `  - ${source.title} (${source.publisher}, consulté le ${source.accessedAt}) : ${source.url}`)
  .join("\n");
const evidenceSourceIds = (value: unknown) => {
  const collected = new Set<string>();
  const visit = (candidate: unknown): void => {
    if (Array.isArray(candidate)) {
      for (const item of candidate) visit(item);
      return;
    }
    if (!candidate || typeof candidate !== "object") return;
    for (const [key, item] of Object.entries(candidate)) {
      if (key === "sourceIds" && Array.isArray(item)) {
        for (const sourceId of item) if (typeof sourceId === "string") collected.add(sourceId);
      } else visit(item);
    }
  };
  visit(value);
  return [...collected];
};
const displayValue = (evidence: { value: unknown; status: string; note?: string }) => {
  if (evidence.value === null) return `À confirmer${evidence.note ? ` : ${evidence.note}` : ""}`;
  if (typeof evidence.value === "boolean") return evidence.value ? "Oui" : "Non";
  if (typeof evidence.value === "object") return JSON.stringify(evidence.value);
  return String(evidence.value);
};

const questionSections = practicalQuestions.map((question) => {
  const recommendationSourceIds = question.recommendations.flatMap((recommendation) => recommendation.sourceIds);
  return `## ${question.title}

URL : https://pa.l0g.fr/questions/${question.slug}/
Mise à jour : ${question.checkedAt}

Réponse courte : ${question.shortAnswer}

${question.answerDetail}

Options :
${question.recommendations.map((recommendation) => `- ${recommendation.label} : ${recommendation.detail}`).join("\n")}

À contrôler :
${question.checks.map((check) => `- ${check}`).join("\n")}

Sources :
${linkedSources([...question.sourceIds, ...recommendationSourceIds]) || "  - Aucune source supplémentaire"}`;
}).join("\n\n");

const platformSections = platforms.map((platform) => {
  const research = researchForPlatform(platform.slug);
  const observation = publicSiteObservationForPlatform(platform.slug);
  return `## ${platform.displayName}

URL : https://pa.l0g.fr/plateformes/${platform.slug}/
Nom officiel : ${platform.officialName}
Cibles : ${platform.targets.join(", ")}

${platform.summary}

- Prix : ${displayValue(platform.pricing)}
- Volume inclus : ${displayValue(platform.allowance)}
- Émission : ${displayValue(platform.sendsInvoices)}
- Réception : ${displayValue(platform.receivesInvoices)}
- E-reporting : ${displayValue(platform.eReporting)}
- Compte bancaire requis : ${displayValue(platform.bankAccountRequired)}
- Accès comptable : ${displayValue(platform.accountantAccess)}
- API publique : ${displayValue(platform.publicApi)}
- Export documenté : ${displayValue(platform.exportDocumented)}
- Formats : ${displayValue(platform.formats)}
- Engagement : ${displayValue(platform.commitmentMonths)}
- Disponibilité actuelle, émission : ${displayValue(research.availability.sendsInvoices)}
- Disponibilité actuelle, réception : ${displayValue(research.availability.receivesInvoices)}
- Disponibilité actuelle, e-reporting : ${displayValue(research.availability.eReporting)}
- Import direct d'un fichier tiers : ${displayValue(research.directImport)}
- Prix des dépassements : ${displayValue(research.overagePricing)}
- Données remises au départ : ${displayValue(research.exitTerms)}
- Résiliation : ${displayValue(research.terminationTerms)}
- Hébergeurs nommés : ${displayValue(research.hostingProviders)}
- Sous-traitants déclarés : ${displayValue(research.declaredSubprocessors)}
- Périmètre ISO 27001 public : ${displayValue(research.iso27001Scope)}

Site public : ${observation.status === "observed" ? `observé le ${observation.checkedAt}, ${observation.trackers.length} domaine(s) classé(s) pendant ce chargement avant choix du bandeau` : "observation non publiée"}
${observation.trackers.map((tracker) => `- ${tracker.entity} | ${tracker.domain} | ${tracker.categories.join(", ")}`).join("\n")}

Points à confirmer :
${platform.importantUnknowns.map((item) => `- ${item}`).join("\n")}

Sources :
${linkedSources([
  ...evidenceSourceIds({ platform, research }),
  ...(observation.status === "observed" ? TRACKER_OBSERVATION_SOURCE_IDS : []),
])}`;
}).join("\n\n");

const directorySections = [
  ...officialDirectory.approved.map((entry) => `- ${entry.name} | approuvée | ${entry.registeredAt} | ${entry.city} | ${entry.website}`),
  ...officialDirectory.pending.map((entry) => `- ${entry.name} | en attente | ${entry.city} | ${entry.website}`),
].join("\n");

const sourceIndex = sources
  .map((source) => `- ${source.id} | ${source.title} | ${source.publisher} | ${source.type} | ${source.accessedAt} | ${source.url}`)
  .join("\n");

const content = `# PA Check, corpus complet pour les agents

MCP : https://pa.l0g.fr/api/mcp
Corpus JSON : https://pa.l0g.fr/api/corpus.json
Révision déployée : https://pa.l0g.fr/DEPLOYED_SHA
Méthodologie : https://pa.l0g.fr/methodologie/

Ce document reprend les réponses, les 148 fiches enrichies, l'annuaire DGFiP et l'index des sources. Une information marquée « À confirmer » ne doit pas être transformée en oui.

# Questions pratiques

${questionSections}

# Plateformes enrichies

${platformSections}

# Annuaire officiel au ${officialDirectory.snapshotDate}

Format : nom | statut | date d'immatriculation si disponible | ville | site

${directorySections}

# Index des sources

${sourceIndex}
`;

export const GET: APIRoute = () => new Response(content, {
  headers: {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  },
});
