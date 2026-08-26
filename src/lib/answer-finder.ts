import { journeyProfiles } from "../data/journey-profiles.ts";
import { practicalQuestionKeywords, practicalQuestions } from "../data/practical-questions.ts";

export type FinderEntry = {
  kind: "Réponse pratique" | "Vérifier mon outil";
  label: string;
  detail: string;
  href: string;
  search: string;
  aliases?: readonly string[];
};

const normalize = (value: string): string => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("fr")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const entries: FinderEntry[] = [
  ...practicalQuestions.map((question) => ({
    kind: "Réponse pratique" as const,
    label: question.shortLabel,
    detail: question.shortAnswer,
    href: `/questions/${question.slug}/`,
    search: normalize([question.shortLabel, question.title, question.description, question.category, question.shortAnswer, practicalQuestionKeywords[question.slug] ?? ""].join(" ")),
  })),
  ...journeyProfiles.map((profile) => ({
    kind: "Vérifier mon outil" as const,
    label: profile.toolLabel,
    detail: "Savoir si vous pouvez le garder et quoi faire ensuite.",
    href: `/verifier-mon-outil/#outil=${encodeURIComponent(profile.toolLabel)}`,
    search: normalize([profile.toolLabel, ...profile.aliases, "garder conserver utiliser utilise changer logiciel outil actuel"].join(" ")),
    aliases: profile.aliases.map(normalize),
  })),
];

const stopWords = new Set(["alors", "avec", "avoir", "cherche", "chercher", "comment", "dans", "des", "elle", "est", "faire", "faut", "les", "mes", "mon", "par", "passer", "peut", "peux", "pour", "prendre", "prenant", "puis", "que", "quel", "quelle", "quelles", "quels", "sans", "une", "votre", "veux"]);

const queryTerms = (query: string): string[] => [...new Set(query.split(" ").flatMap((term) => {
  if (term === "pa" || term === "pdp") return ["plateforme", "agreee"];
  if (term === "sc") return ["solution", "compatible"];
  return [term];
}).filter((term) => term.length > 2 && !stopWords.has(term)))];

const toolIntentTerms = new Set(["actuel", "changer", "conserver", "garder", "logiciel", "outil", "utilise", "utiliser"]);

const score = (entry: FinderEntry, query: string): number => {
  const terms = queryTerms(query);
  if (!terms.length) return 0;
  if (entry.kind === "Vérifier mon outil" && entry.aliases?.some((alias) => ` ${query} `.includes(` ${alias} `))) {
    if (terms.some((term) => toolIntentTerms.has(term))) return 120;
    if (entry.aliases.includes(query)) return 110;
  }
  const matched = terms.filter((term) => entry.search.includes(term));
  if (!matched.length || matched.length / terms.length < .6) return 0;
  const label = normalize(entry.label);
  if (label === query) return 100;
  if (label.startsWith(query)) return 70;
  if (label.includes(query)) return 55;
  return 20 + Math.round(20 * matched.length / terms.length) + matched.reduce((total, term) => total + (label.includes(term) ? 4 : 1), 0);
};

export function findAnswers(value: string, limit = 6): FinderEntry[] {
  const query = normalize(value);
  if (query.length < 2) return [];
  return entries
    .map((entry) => ({ entry, score: score(entry, query) }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.entry.label.localeCompare(right.entry.label, "fr"))
    .slice(0, limit)
    .map((candidate) => candidate.entry);
}
