import { journeyProfiles, type JourneyAudience, type JourneyProfileDefinition, type JourneyProfileId } from "../data/journey-profiles.ts";
import type { Evidence, Platform } from "../data/types.ts";

export type { JourneyAudience, JourneyProfileId } from "../data/journey-profiles.ts";
export type ActivationAnswer = "yes" | "no" | "unknown";
export type JourneyStatus = "ready" | "action" | "confirm";
export type JourneyNodeState = "done" | "action" | "confirm";

export interface JourneyInput {
  tool: string;
  audience: JourneyAudience;
  activation: ActivationAnswer;
}

export interface JourneyNode {
  label: string;
  value: string;
  detail: string;
  state: JourneyNodeState;
  sourceIds: string[];
}

export interface JourneyDeadline {
  label: string;
  date: string;
  detail: string;
  sourceIds: string[];
}

export interface JourneyCost {
  baseMonthlyFrom: number | null;
  paMonthlySurcharge: number | null;
  horizons: Array<{ months: 12 | 24 | 36; minimum: number }>;
  label: string;
  caveat: string;
  sourceIds: string[];
}

export interface JourneyAction {
  title: string;
  detail: string;
  sourceIds: string[];
}

export interface InvoiceJourney {
  profileId: JourneyProfileId;
  platformSlug: string;
  toolLabel: string;
  activationQuestion: string;
  status: JourneyStatus;
  headline: string;
  summary: string;
  nodes: JourneyNode[];
  deadlines: JourneyDeadline[];
  cost: JourneyCost;
  actions: JourneyAction[];
}

const coreFields = [
  { key: "receivesInvoices", label: "réception", phrase: "la réception" },
  { key: "sendsInvoices", label: "émission", phrase: "l'émission" },
  { key: "eReporting", label: "e-reporting", phrase: "l'e-reporting" },
] as const;

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function profileFor(tool: string): JourneyProfileDefinition | null {
  const normalized = normalize(tool);
  if (!normalized) return null;
  return journeyProfiles.find((profile) => profile.aliases.some((alias) => normalize(alias) === normalized)) ?? null;
}

export function findJourneyProfile(tool: string): JourneyProfileId | null {
  return profileFor(tool)?.id ?? null;
}

function deadlineFor(audience: JourneyAudience): JourneyDeadline[] {
  const largeCompany = audience === "eti-ge";
  return [
    {
      label: "Recevoir",
      date: "1er septembre 2026",
      detail: "Toutes les entreprises concernées doivent pouvoir recevoir leurs factures électroniques.",
      sourceIds: ["aife-calendar-2026"],
    },
    {
      label: "Émettre et déclarer",
      date: largeCompany ? "1er septembre 2026" : "1er septembre 2027",
      detail: largeCompany
        ? "Les ETI et grandes entreprises doivent émettre leurs factures électroniques et transmettre leur e-reporting à cette date."
        : "Les micro-entrepreneurs, TPE et PME doivent émettre leurs factures électroniques et transmettre leur e-reporting à cette date.",
      sourceIds: ["aife-calendar-2026"],
    },
  ];
}

function evidenceState(evidence: Evidence<boolean>): "yes" | "no" | "unknown" {
  const strong = (evidence.status === "official" || evidence.status === "documented") && evidence.sourceIds.length > 0;
  if (evidence.value === true && strong) return "yes";
  if (evidence.value === false && strong) return "no";
  return "unknown";
}

function activationState(answer: ActivationAnswer): JourneyNodeState {
  if (answer === "yes") return "done";
  if (answer === "no") return "action";
  return "confirm";
}

function horizons(baseMonthlyFrom: number | null): JourneyCost["horizons"] {
  if (baseMonthlyFrom === null) return [];
  return ([12, 24, 36] as const).map((months) => ({ months, minimum: baseMonthlyFrom * months }));
}

function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "une fonction";
  return `${labels.slice(0, -1).join(", ")} et ${labels.at(-1)}`;
}

function upperFirst(value: string): string {
  return value.length > 0 ? `${value[0]?.toLocaleUpperCase("fr")}${value.slice(1)}` : value;
}

function buildActions(
  profile: JourneyProfileDefinition,
  activation: ActivationAnswer,
  missingCore: Array<{ label: string; phrase: string; evidence: Evidence<boolean> }>,
  absentCore: Array<{ label: string; phrase: string; evidence: Evidence<boolean> }>,
): JourneyAction[] {
  const actions: JourneyAction[] = [];
  const problemFields = absentCore.length > 0 ? absentCore : missingCore;
  if (problemFields.length > 0) {
    const labels = joinLabels(problemFields.map((field) => field.phrase));
    const notes = problemFields.map((field) => field.evidence.note).filter((note): note is string => Boolean(note));
    actions.push({
      title: absentCore.length > 0 ? `Trouvez une solution pour ${labels}` : `Confirmez ${labels}`,
      detail: notes[0] ?? `Demandez à l'éditeur si ${labels} sera disponible pour votre entreprise et à quelle date.`,
      sourceIds: [...new Set([...profile.contextSourceIds, ...problemFields.flatMap((field) => field.evidence.sourceIds)])],
    });
  }

  if (activation === "yes") {
    actions.push({ ...profile.activation.checkAction, sourceIds: [...profile.activation.checkAction.sourceIds] });
  } else if (activation === "no") {
    actions.push(
      { ...profile.activation.openAction, sourceIds: [...profile.activation.openAction.sourceIds] },
      { ...profile.activation.activateAction, sourceIds: [...profile.activation.activateAction.sourceIds] },
      { ...profile.activation.checkAction, sourceIds: [...profile.activation.checkAction.sourceIds] },
    );
  } else {
    actions.push(
      { ...profile.activation.openAction, sourceIds: [...profile.activation.openAction.sourceIds] },
      { ...profile.activation.checkAction, sourceIds: [...profile.activation.checkAction.sourceIds] },
    );
  }

  actions.push(...profile.afterActivationActions.map((action) => ({ ...action, sourceIds: [...action.sourceIds] })));
  return actions.slice(0, 3);
}

export function buildInvoiceJourney(platforms: Platform[], input: JourneyInput): InvoiceJourney | null {
  const profile = profileFor(input.tool);
  if (!profile) return null;
  const platform = platforms.find((candidate) => candidate.slug === profile.platformSlug);
  if (!platform) return null;

  const core = coreFields.map(({ key, label, phrase }) => ({ label, phrase, evidence: platform[key], state: evidenceState(platform[key]) }));
  const absentCore = core.filter((field) => field.state === "no");
  const missingCore = core.filter((field) => field.state === "unknown");
  const availableCore = core.filter((field) => field.state === "yes");
  const coreState: JourneyNodeState = absentCore.length > 0 ? "action" : missingCore.length > 0 ? "confirm" : "done";
  const activationNodeState = activationState(input.activation);
  const status: JourneyStatus = absentCore.length > 0 || input.activation === "no"
    ? "action"
    : missingCore.length > 0 || input.activation === "unknown"
      ? "confirm"
      : "ready";

  const missingLabels = joinLabels(missingCore.map((field) => field.label));
  const absentLabels = joinLabels(absentCore.map((field) => field.label));
  const missingPhrases = joinLabels(missingCore.map((field) => field.phrase));
  const absentPhrases = joinLabels(absentCore.map((field) => field.phrase));
  const headline = absentCore.length > 0
    ? `${upperFirst(absentPhrases)} ${absentCore.length > 1 ? "ne sont pas disponibles" : "n'est pas disponible"} pour ${profile.toolLabel}`
    : input.activation === "no"
      ? `Il reste à activer ${platform.displayName}`
      : missingCore.length > 0
        ? `${upperFirst(missingPhrases)} ${missingCore.length > 1 ? "restent" : "reste"} à confirmer pour ${profile.toolLabel}`
        : input.activation === "unknown"
          ? `Vérifiez l'activation dans ${profile.toolLabel}`
          : `Votre parcours ${profile.toolLabel} semble prêt`;

  const coreSummary = absentCore.length > 0
    ? `Les informations consultées indiquent que ${absentPhrases} ${absentCore.length > 1 ? "ne sont pas disponibles" : "n'est pas disponible"}.`
    : missingCore.length > 0
      ? `Les informations publiques ne permettent pas encore de confirmer ${missingPhrases} pour toutes les entreprises.`
      : "La réception, l'émission et l'e-reporting sont documentés.";
  const activationSummary = input.activation === "yes"
    ? "Vous indiquez que la plateforme est active pour votre entreprise."
    : input.activation === "no"
      ? "L'activation pour votre entreprise reste à effectuer."
      : "Son activation effective pour votre entreprise reste à vérifier.";
  const activationValue = input.activation === "yes"
    ? profile.activation.yesValue
    : input.activation === "no"
      ? profile.activation.noValue
      : profile.activation.unknownValue;
  const fluxValue = [
    availableCore.length > 0 ? `Documenté : ${joinLabels(availableCore.map((field) => field.label))}` : "",
    missingCore.length > 0 ? `À confirmer : ${missingLabels}` : "",
    absentCore.length > 0 ? `Non couvert : ${absentLabels}` : "",
  ].filter(Boolean).join(" · ");
  const costDefinition = profile.costByAudience[input.audience];

  return {
    profileId: profile.id,
    platformSlug: profile.platformSlug,
    toolLabel: profile.toolLabel,
    activationQuestion: profile.activation.question,
    status,
    headline,
    summary: `${coreSummary} ${activationSummary}`,
    nodes: [
      {
        label: "Votre outil",
        value: profile.toolLabel,
        detail: profile.toolDetail,
        state: "done",
        sourceIds: [...profile.toolSourceIds],
      },
      {
        label: "Plateforme agréée",
        value: platform.officialName,
        detail: "Immatriculation confirmée dans la liste de la DGFiP.",
        state: "done",
        sourceIds: [...platform.officialStatus.sourceIds],
      },
      {
        label: profile.activation.label,
        value: activationValue,
        detail: input.activation === "yes" ? profile.activation.yesDetail : profile.activation.todoDetail,
        state: activationNodeState,
        sourceIds: [...profile.activation.sourceIds],
      },
      {
        label: "Flux couverts",
        value: fluxValue,
        detail: coreState === "done"
          ? "Les trois fonctions nécessaires sont documentées dans les sources consultées."
          : "Le statut tient compte des limites ou contradictions trouvées dans la documentation publique.",
        state: coreState,
        sourceIds: [...new Set([...core.flatMap((field) => field.evidence.sourceIds), ...profile.contextSourceIds])],
      },
    ],
    deadlines: deadlineFor(input.audience),
    cost: {
      baseMonthlyFrom: costDefinition.baseMonthlyFrom,
      paMonthlySurcharge: costDefinition.paMonthlySurcharge,
      horizons: horizons(costDefinition.baseMonthlyFrom),
      label: costDefinition.label,
      caveat: costDefinition.caveat,
      sourceIds: [...costDefinition.sourceIds],
    },
    actions: buildActions(profile, input.activation, missingCore, absentCore),
  };
}
