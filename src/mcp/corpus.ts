import officialDirectory from "../data/official-directory.json" with { type: "json" };
import sources from "../data/sources.json" with { type: "json" };
import { directRoutingOptions } from "../data/direct-routing-options.ts";
import { journeyProfiles } from "../data/journey-profiles.ts";
import { passportRoutes } from "../data/passport-routes.ts";
import { platforms } from "../data/platforms.ts";
import {
  practicalQuestionKeywords,
  practicalQuestions,
  QUESTIONS_CHECKED_AT,
  type PracticalQuestion,
} from "../data/practical-questions.ts";
import type { DiagnosticInput, Evidence, Platform, SourceRecord } from "../data/types.ts";
import { documentationCoverage } from "../lib/evidence.ts";
import { runDiagnostic } from "../lib/matcher.ts";

export const MCP_ENDPOINT = "https://pa.l0g.fr/api/mcp";
export const MCP_SERVER_NAME = "io.github.bluetouff/pa-check";
export const MCP_SERVER_TITLE = "PA Check";
export const MCP_SERVER_VERSION = "0.1.0";
export const MCP_CORPUS_CHECKED_AT = QUESTIONS_CHECKED_AT;

const sourceRecords = sources as SourceRecord[];
const sourcesById = new Map(sourceRecords.map((source) => [source.id, source]));
const platformsBySlug = new Map(platforms.map((platform) => [platform.slug, platform]));
const questionsBySlug = new Map(practicalQuestions.map((question) => [question.slug, question]));
const journeyAliases = journeyProfiles.flatMap((profile) => [profile.toolLabel, ...profile.aliases]).join(" ");
const SEARCH_STOP_WORDS = new Set([
  "a", "au", "aux", "avec", "ce", "ces", "comment", "dans", "de", "des", "du", "elle", "en",
  "est", "et", "faire", "il", "je", "la", "le", "les", "ma", "mes", "mon", "ne", "ou", "par",
  "pas", "peut", "pour", "que", "quel", "quelle", "qui", "sa", "sans", "se", "son", "sur", "un",
  "une", "votre", "vous",
]);

export interface CorpusRevision {
  revision: string;
  builtAt: string;
}

export interface PlatformSearchInput extends DiagnosticInput {
  limit: number;
}

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(value: string): string[] {
  return [...new Set(normalize(value).split(" ").filter((token) => token.length > 1 && !SEARCH_STOP_WORDS.has(token)))];
}

function scoreText(query: string, fields: Array<{ value: string; weight: number }>): number {
  const normalizedQuery = normalize(query);
  const queryTokens = tokens(query);
  let score = 0;

  for (const field of fields) {
    const normalizedField = normalize(field.value);
    if (!normalizedField) continue;
    if (normalizedField === normalizedQuery) score += field.weight * 8;
    else if (normalizedField.includes(normalizedQuery)) score += field.weight * 4;
    for (const token of queryTokens) {
      if (normalizedField.split(" ").includes(token)) score += field.weight * 2;
      else if (normalizedField.includes(token)) score += field.weight;
    }
  }

  return score;
}

function uniqueSourceIds(value: unknown): string[] {
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
      } else {
        visit(item);
      }
    }
  };
  visit(value);
  return [...collected];
}

export function expandSources(sourceIds: readonly string[]): SourceRecord[] {
  return [...new Set(sourceIds)]
    .map((sourceId) => sourcesById.get(sourceId))
    .filter((source): source is SourceRecord => source !== undefined);
}

function knownValue<T>(evidence: Evidence<T>): T | null {
  if (evidence.value === null || evidence.sourceIds.length === 0) return null;
  return evidence.status === "official" || evidence.status === "documented" ? evidence.value : null;
}

function presentEvidence<T>(evidence: Evidence<T>) {
  return {
    value: knownValue(evidence),
    status: evidence.status,
    checkedAt: evidence.checkedAt,
    note: evidence.note ?? null,
    sources: expandSources(evidence.sourceIds),
  };
}

function presentQuestion(question: PracticalQuestion) {
  return {
    slug: question.slug,
    title: question.title,
    category: question.category,
    questionUrl: `https://pa.l0g.fr/questions/${question.slug}/`,
    answer: question.shortAnswer,
    detail: question.answerDetail,
    recommendations: question.recommendations.map((recommendation) => ({
      label: recommendation.label,
      detail: recommendation.detail,
      position: recommendation.state,
      platformSlug: recommendation.platformSlug,
      url: recommendation.href ? new URL(recommendation.href, "https://pa.l0g.fr").href : null,
      sources: expandSources(recommendation.sourceIds),
    })),
    checksBeforeChoosing: question.checks,
    nextAction: {
      label: question.nextAction.label,
      url: new URL(question.nextAction.href, "https://pa.l0g.fr").href,
    },
    checkedAt: question.checkedAt,
    sources: expandSources(question.sourceIds),
  };
}

export function presentPlatform(platform: Platform) {
  return {
    slug: platform.slug,
    name: platform.displayName,
    officialName: platform.officialName,
    profileUrl: `https://pa.l0g.fr/plateformes/${platform.slug}/`,
    summary: platform.summary,
    targets: platform.targets,
    ecosystem: platform.ecosystem,
    documentationCoverage: documentationCoverage(platform),
    registration: {
      status: presentEvidence(platform.officialStatus),
      registeredAt: presentEvidence(platform.registeredAt),
    },
    pricing: presentEvidence(platform.pricing),
    allowance: presentEvidence(platform.allowance),
    functions: {
      sendsInvoices: presentEvidence(platform.sendsInvoices),
      receivesInvoices: presentEvidence(platform.receivesInvoices),
      eReporting: presentEvidence(platform.eReporting),
      accountantAccess: presentEvidence(platform.accountantAccess),
      publicApi: presentEvidence(platform.publicApi),
      exportDocumented: presentEvidence(platform.exportDocumented),
    },
    conditions: {
      bankAccountRequired: presentEvidence(platform.bankAccountRequired),
      commitmentMonths: presentEvidence(platform.commitmentMonths),
    },
    technical: {
      integrations: presentEvidence(platform.integrations),
      formats: presentEvidence(platform.formats),
      hostingCountries: presentEvidence(platform.hostingCountries),
      iso27001: presentEvidence(platform.iso27001),
    },
    pointsToConfirm: platform.importantUnknowns,
    sources: expandSources(uniqueSourceIds(platform)),
  };
}

export function answerQuestion(query: string, limit = 5) {
  const ranked = practicalQuestions
    .map((question) => ({
      question,
      score: scoreText(query, [
        { value: question.slug, weight: 7 },
        { value: question.title, weight: 6 },
        { value: question.shortLabel, weight: 5 },
        { value: question.category, weight: 4 },
        { value: question.description, weight: 3 },
        { value: question.shortAnswer, weight: 2 },
        { value: question.answerDetail, weight: 1 },
        { value: practicalQuestionKeywords[question.slug] ?? "", weight: 5 },
        ...(question.slug === "garder-son-logiciel-de-facturation" ? [{ value: journeyAliases, weight: 6 }] : []),
        ...question.recommendations.map((item) => ({ value: `${item.label} ${item.detail}`, weight: 2 })),
      ]),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.question.title.localeCompare(b.question.title, "fr"))
    .slice(0, limit);

  return {
    query,
    found: ranked.length > 0,
    answer: ranked[0] ? presentQuestion(ranked[0].question) : null,
    otherRelevantQuestions: ranked.slice(1).map(({ question }) => ({
      slug: question.slug,
      title: question.title,
      answer: question.shortAnswer,
      url: `https://pa.l0g.fr/questions/${question.slug}/`,
    })),
    fallback: ranked.length === 0
      ? {
          message: `Aucune réponse assez proche n'est publiée dans les ${practicalQuestions.length} questions actuelles.`,
          availableQuestions: practicalQuestions.map((question) => ({ slug: question.slug, title: question.title })),
        }
      : null,
  };
}

export function getQuestion(slug: string) {
  const question = questionsBySlug.get(normalize(slug).replace(/ /g, "-"));
  return question ? presentQuestion(question) : null;
}

export function searchPlatforms(query: string, limit = 10) {
  return platforms
    .map((platform) => ({
      platform,
      score: scoreText(query, [
        { value: platform.slug, weight: 8 },
        { value: platform.displayName, weight: 8 },
        { value: platform.officialName, weight: 7 },
        { value: platform.summary, weight: 3 },
        { value: platform.targets.join(" "), weight: 2 },
        { value: platform.ecosystem.join(" "), weight: 2 },
        { value: platform.importantUnknowns.join(" "), weight: 1 },
      ]),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.platform.displayName.localeCompare(b.platform.displayName, "fr"))
    .slice(0, limit)
    .map(({ platform }) => ({
      slug: platform.slug,
      name: platform.displayName,
      summary: platform.summary,
      targets: platform.targets,
      url: `https://pa.l0g.fr/plateformes/${platform.slug}/`,
    }));
}

export function getPlatform(slugOrName: string) {
  const normalized = normalize(slugOrName);
  const direct = platformsBySlug.get(normalized.replace(/ /g, "-"));
  if (direct) return presentPlatform(direct);
  const exact = platforms.find((platform) =>
    [platform.displayName, platform.officialName].some((name) => normalize(name) === normalized));
  return exact ? presentPlatform(exact) : null;
}

export function findPlatforms(input: PlatformSearchInput) {
  const { limit, ...diagnosticInput } = input;
  const results = runDiagnostic(platforms, diagnosticInput);
  const eligible = results.filter((result) => result.eligible);
  const selected = (eligible.length > 0 ? eligible : results).slice(0, limit);

  return {
    criteria: diagnosticInput,
    eligibleCount: eligible.length,
    resultType: eligible.length > 0 ? "matching-options" : "points-to-resolve",
    options: selected.map((result) => ({
      slug: result.platform.slug,
      name: result.platform.displayName,
      url: `https://pa.l0g.fr/plateformes/${result.platform.slug}/`,
      fitsAllCriteria: result.eligible,
      whyItMayFit: result.reasons,
      blockers: result.blockers,
      pointsToConfirm: result.unknowns,
      minimumAnnualCostKnown: result.annualCost,
      pricing: presentEvidence(result.platform.pricing),
      sources: expandSources(uniqueSourceIds(result.platform)),
    })),
    note: eligible.length > 0
      ? "Ces options répondent aux critères documentés. Vérifiez le contrat et l'activation correspondant à votre offre."
      : "Aucune fiche ne répond à tous les critères documentés. Les options affichées indiquent ce qui bloque ou reste à confirmer.",
  };
}

export function searchOfficialDirectory(query: string, status: "approved" | "pending" | "all", limit = 20) {
  const entries = [
    ...(status === "pending" ? [] : officialDirectory.approved.map((entry) => ({ ...entry, status: "approved" as const }))),
    ...(status === "approved" ? [] : officialDirectory.pending.map((entry) => ({ ...entry, status: "pending" as const }))),
  ];
  return entries
    .map((entry) => ({
      entry,
      score: scoreText(query, [
        { value: entry.name, weight: 8 },
        { value: entry.city, weight: 3 },
        { value: entry.website, weight: 2 },
      ]),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name, "fr"))
    .slice(0, limit)
    .map(({ entry }) => ({
      name: entry.name,
      status: entry.status,
      registeredAt: "registeredAt" in entry ? entry.registeredAt : null,
      city: entry.city,
      website: entry.website,
    }));
}

export function corpusManifest(revision: CorpusRevision) {
  return {
    schemaVersion: "0.1.0",
    server: {
      name: MCP_SERVER_NAME,
      title: MCP_SERVER_TITLE,
      version: MCP_SERVER_VERSION,
      endpoint: MCP_ENDPOINT,
      readOnly: true,
    },
    revision,
    checkedAt: MCP_CORPUS_CHECKED_AT,
    officialDirectorySnapshot: officialDirectory.snapshotDate,
    counts: {
      questions: practicalQuestions.length,
      enrichedPlatforms: platforms.length,
      approvedPlatforms: officialDirectory.approved.length,
      pendingPlatforms: officialDirectory.pending.length,
      journeys: journeyProfiles.length,
      invoiceRoutes: passportRoutes.length,
      directRoutingOptions: directRoutingOptions.length,
      sources: sourceRecords.length,
    },
    canonical: {
      site: "https://pa.l0g.fr/",
      methodology: "https://pa.l0g.fr/methodologie/",
      changes: "https://pa.l0g.fr/changements/",
      repository: "https://github.com/bluetouff/facture-radar",
    },
    limits: [
      "Le corpus reprend des informations publiques datées.",
      "Une information absente reste à confirmer et n'est pas transformée en oui.",
      "Le serveur ne reçoit ni facture, ni SIREN, ni donnée de compte.",
      "Le contrôle de fichier reste exclusivement dans le navigateur du site.",
    ],
  };
}

export function corpusResources(revision: CorpusRevision) {
  return {
    manifest: corpusManifest(revision),
    questions: {
      checkedAt: QUESTIONS_CHECKED_AT,
      questions: practicalQuestions,
      sources: expandSources(uniqueSourceIds(practicalQuestions)),
    },
    platforms: {
      checkedAt: MCP_CORPUS_CHECKED_AT,
      platforms,
      sources: expandSources(uniqueSourceIds(platforms)),
    },
    officialDirectory,
    journeys: {
      checkedAt: MCP_CORPUS_CHECKED_AT,
      journeys: journeyProfiles,
      sources: expandSources(uniqueSourceIds(journeyProfiles)),
    },
    invoiceRoutes: {
      checkedAt: MCP_CORPUS_CHECKED_AT,
      passportRoutes,
      directRoutingOptions,
      sources: expandSources(uniqueSourceIds([passportRoutes, directRoutingOptions])),
    },
    sources: sourceRecords,
  };
}

export function getResourceByUri(uri: string, revision: CorpusRevision): unknown | null {
  const resources = corpusResources(revision);
  const staticResources = new Map<string, unknown>([
    ["pacheck://corpus/manifest", resources.manifest],
    ["pacheck://corpus/questions", resources.questions],
    ["pacheck://corpus/platforms", resources.platforms],
    ["pacheck://corpus/official-directory", resources.officialDirectory],
    ["pacheck://corpus/journeys", resources.journeys],
    ["pacheck://corpus/invoice-routes", resources.invoiceRoutes],
    ["pacheck://corpus/sources", resources.sources],
  ]);
  const staticResult = staticResources.get(uri);
  if (staticResult !== undefined) return staticResult;

  const parsed = new URL(uri);
  if (parsed.protocol !== "pacheck:") return null;
  const identifier = decodeURIComponent(parsed.pathname.slice(1));
  if (parsed.hostname === "platforms") return getPlatform(identifier);
  if (parsed.hostname === "questions") return getQuestion(identifier);
  if (parsed.hostname === "sources") return sourcesById.get(identifier) ?? null;
  return null;
}

export const mcpCorpusData = {
  officialDirectory,
  platforms,
  practicalQuestions,
  journeyProfiles,
  passportRoutes,
  directRoutingOptions,
  sources: sourceRecords,
};
