import { journeyProfiles } from "../data/journey-profiles.ts";
import { practicalQuestions } from "../data/practical-questions.ts";

export type FinderEntry = {
  kind: "Réponse pratique" | "Vérifier mon outil";
  label: string;
  detail: string;
  href: string;
  search: string;
};

const normalize = (value: string): string => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("fr")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const questionKeywords: Record<string, string> = {
  "envoyer-factur-x-sans-solution-compatible": "pdf facturex factur x xml en16931 plateforme agreee solution compatible sc import depot direct fichier tiers b2brouter",
  "garder-son-logiciel-de-facturation": "garder conserver logiciel outil existant changer edition activation raccordement",
  "plateforme-gratuite-sans-compte-bancaire": "gratuit gratuite compte bancaire banque iban compte pro facultatif sans abonnement",
  "plateforme-pour-micro-entrepreneur": "micro auto entrepreneur independant petite activite faible volume",
  "plateforme-pour-travailler-avec-comptable": "comptable cabinet expert comptable collaboration acces partage",
  "facturer-particuliers-et-clients-etrangers": "particulier b2c international etranger e reporting ereporting",
  "plateforme-avec-api": "api connexion integration erp automatisation developpeur",
  "cout-plateforme-sur-12-24-mois": "prix cout tarif budget abonnement 12 24 mois",
  "recuperer-ses-factures-en-changeant-de-plateforme": "sortie export recuperer factures donnees migration changer resiliation",
  "outil-absent-questions-a-poser-editeur": "outil absent inconnu editeur logiciel non trouve questions demander",
};

const entries: FinderEntry[] = [
  ...practicalQuestions.map((question) => ({
    kind: "Réponse pratique" as const,
    label: question.shortLabel,
    detail: question.shortAnswer,
    href: `/questions/${question.slug}/`,
    search: normalize([question.shortLabel, question.title, question.description, question.category, question.shortAnswer, questionKeywords[question.slug] ?? ""].join(" ")),
  })),
  ...journeyProfiles.map((profile) => ({
    kind: "Vérifier mon outil" as const,
    label: profile.toolLabel,
    detail: "Savoir si vous pouvez le garder et quoi faire ensuite.",
    href: `/verifier-mon-outil/#outil=${encodeURIComponent(profile.toolLabel)}`,
    search: normalize([profile.toolLabel, ...profile.aliases].join(" ")),
  })),
];

const stopWords = new Set(["alors", "avec", "avoir", "cherche", "chercher", "comment", "dans", "des", "elle", "est", "faire", "faut", "les", "mes", "mon", "par", "passer", "peut", "peux", "pour", "prendre", "prenant", "puis", "que", "quel", "quelle", "quelles", "quels", "sans", "une", "votre", "veux"]);

const queryTerms = (query: string): string[] => [...new Set(query.split(" ").flatMap((term) => {
  if (term === "pa" || term === "pdp") return ["plateforme", "agreee"];
  if (term === "sc") return ["solution", "compatible"];
  return [term];
}).filter((term) => term.length > 2 && !stopWords.has(term)))];

const score = (entry: FinderEntry, query: string): number => {
  const terms = queryTerms(query);
  if (!terms.length) return 0;
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
