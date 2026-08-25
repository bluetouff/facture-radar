import type { Evidence, Platform } from "../data/types.ts";

export type ToolVerdict = "keep" | "act" | "unconfirmed";
export type ToolRelation = "direct" | "connected";

export interface KnownTool {
  id: string;
  label: string;
  aliases: string[];
  platformSlug: string;
  relation: ToolRelation;
  relationNote?: string;
}

export interface VerificationLine {
  label: string;
  value: string;
  state: "yes" | "no" | "unknown";
  evidence: Evidence<unknown> | null;
}

export interface ToolVerification {
  verdict: ToolVerdict;
  headline: string;
  explanation: string;
  action: string;
  tool: KnownTool | null;
  platform: Platform | null;
  lines: VerificationLine[];
}

export const knownTools: KnownTool[] = [
  { id: "cegid-pa", label: "Plateforme Agréée Cegid", aliases: ["Cegid PA"], platformSlug: "cegid", relation: "direct" },
  {
    id: "cegid",
    label: "Cegid",
    aliases: ["Cegid Quadra", "Cegid Loop"],
    platformSlug: "cegid",
    relation: "connected",
    relationNote: "Cegid opère une plateforme agréée, mais le produit, l'édition et l'activation utilisés par le client doivent être confirmés.",
  },
  {
    id: "ebp",
    label: "EBP",
    aliases: ["EBP Comptabilité", "EBP Gestion Commerciale"],
    platformSlug: "cegid",
    relation: "connected",
    relationNote: "L'intégration de l'environnement EBP à Cegid est documentée, mais l'édition et l'activation utilisées par le client doivent être confirmées.",
  },
  { id: "abby", label: "Abby", aliases: ["ABBY"], platformSlug: "abby", relation: "direct" },
  { id: "indy", label: "Indy", aliases: ["INDY"], platformSlug: "indy", relation: "direct" },
  { id: "pennylane", label: "Pennylane", aliases: ["PENNYLANE"], platformSlug: "pennylane", relation: "direct" },
  { id: "qonto", label: "Qonto Facturation", aliases: ["Qonto", "QONTO"], platformSlug: "qonto", relation: "direct" },
  { id: "sage-pa", label: "Plateforme Agréée Sage", aliases: ["Sage PA"], platformSlug: "sage", relation: "direct" },
  {
    id: "sage",
    label: "Sage",
    aliases: ["Sage Active", "Sage 50", "Sage 100", "Sage X3", "Sage Intacct", "Sage for Accountants"],
    platformSlug: "sage",
    relation: "connected",
    relationNote: "Sage opère une plateforme agréée intégrée à plusieurs offres, mais l'édition et l'activation du service doivent être confirmées pour le client.",
  },
  { id: "tiime", label: "Tiime", aliases: ["Tiime Invoice", "Tiime Expert", "TIIME PDP"], platformSlug: "tiime", relation: "direct" },
  { id: "myunisoft", label: "MyUnisoft", aliases: ["MyU", "MY UNISOFT"], platformSlug: "myunisoft", relation: "direct" },
  { id: "septeo", label: "Septeo Ingeneo", aliases: ["Septeo", "Ingeneo", "SEPTEO"], platformSlug: "septeo", relation: "direct" },
  {
    id: "teogest",
    label: "Teogest",
    aliases: [],
    platformSlug: "septeo",
    relation: "connected",
    relationNote: "Teogest est documenté dans l'écosystème Septeo, mais l'édition et l'activation de la plateforme agréée doivent être confirmées.",
  },
  { id: "sellsy", label: "Sellsy", aliases: ["TeamSystem Sellsy"], platformSlug: "sellsy", relation: "direct" },
  { id: "superpdp", label: "SuperPDP", aliases: ["SUPER PDP", "Super PDP"], platformSlug: "superpdp", relation: "direct" },
  { id: "sap-pa", label: "SAP Plateforme Agréée", aliases: ["SAP PA"], platformSlug: "sap", relation: "direct" },
  {
    id: "sap",
    label: "SAP",
    aliases: ["SAP S/4HANA", "SAP Business One", "SAP Business Network"],
    platformSlug: "sap",
    relation: "connected",
    relationNote: "SAP opère une plateforme agréée, mais son activation et son intégration dépendent de l'environnement SAP du client.",
  },
  { id: "generix", label: "Generix", aliases: ["GENERIX Group"], platformSlug: "generix", relation: "direct" },
  { id: "esker", label: "Esker", aliases: ["ESKER"], platformSlug: "esker", relation: "direct" },
  { id: "cegedim", label: "Cegedim SY business", aliases: ["Cegedim", "SY business", "CEGEDIM"], platformSlug: "cegedim", relation: "direct" },
];

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function evidenceState(evidence: Evidence<boolean>): VerificationLine["state"] {
  const strongEvidence = (evidence.status === "official" || evidence.status === "documented") && evidence.sourceIds.length > 0;
  if (evidence.value === true && strongEvidence) return "yes";
  if (evidence.value === false && strongEvidence) return "no";
  return "unknown";
}

function booleanLine(label: string, evidence: Evidence<boolean>): VerificationLine {
  const state = evidenceState(evidence);
  return {
    label,
    value: state === "yes" ? "Documenté" : state === "no" ? "Non couvert" : "À confirmer",
    state,
    evidence,
  };
}

export function findKnownTool(query: string): KnownTool | null {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return null;
  return knownTools.find((tool) => [tool.label, ...tool.aliases].some((alias) => normalize(alias) === normalizedQuery)) ?? null;
}

export function verifyKnownTool(platforms: Platform[], query: string): ToolVerification {
  const tool = findKnownTool(query);
  if (!tool) {
    return {
      verdict: "unconfirmed",
      headline: "Impossible à confirmer avec notre corpus",
      explanation: "Cet outil ne fait pas encore partie des parcours documentés. Son absence ne signifie pas qu'il n'est pas conforme.",
      action: "Demandez à l'éditeur le nom de la plateforme agréée utilisée, la date d'activation de la réception et le périmètre prévu pour l'émission et l'e-reporting.",
      tool: null,
      platform: null,
      lines: [],
    };
  }

  const platform = platforms.find((candidate) => candidate.slug === tool.platformSlug) ?? null;
  if (!platform) {
    return {
      verdict: "unconfirmed",
      headline: "Impossible à confirmer avec notre corpus",
      explanation: "Le rattachement existe dans l'index, mais sa fiche de preuve est absente. Le vérificateur refuse de déduire un verdict.",
      action: "Ne conseillez pas ce parcours avant d'avoir identifié et vérifié la plateforme agréée sous-jacente.",
      tool,
      platform: null,
      lines: [],
    };
  }

  const officialLine: VerificationLine = {
    label: "Plateforme agréée",
    value: platform.officialStatus.value === "registered" && platform.officialStatus.status === "official" && platform.officialStatus.sourceIds.length > 0
      ? platform.officialName
      : "À confirmer",
    state: platform.officialStatus.value === "registered" && platform.officialStatus.status === "official" && platform.officialStatus.sourceIds.length > 0
      ? "yes"
      : "unknown",
    evidence: platform.officialStatus,
  };
  const lines = [
    officialLine,
    booleanLine("Réception", platform.receivesInvoices),
    booleanLine("Émission", platform.sendsInvoices),
    booleanLine("E-reporting", platform.eReporting),
  ];

  if (tool.relation === "connected") {
    return {
      verdict: "unconfirmed",
      headline: "Le raccordement est documenté, l'édition reste à confirmer",
      explanation: tool.relationNote ?? "L'outil est relié à une plateforme agréée documentée, mais le périmètre exact utilisé par le client reste à confirmer.",
      action: `Demandez à l'éditeur de confirmer par écrit que l'offre du client active bien ${platform.displayName} pour la réception, l'émission et l'e-reporting.`,
      tool,
      platform,
      lines,
    };
  }

  if (lines.some((line) => line.state === "no")) {
    return {
      verdict: "act",
      headline: "Vous devez agir",
      explanation: "Au moins une fonction réglementaire nécessaire est explicitement indiquée comme non couverte dans les sources retenues.",
      action: "Faites corriger ou remplacer ce parcours avant l'échéance applicable au client.",
      tool,
      platform,
      lines,
    };
  }

  if (lines.some((line) => line.state === "unknown")) {
    const missing = lines.filter((line) => line.state === "unknown").map((line) => line.label.toLocaleLowerCase("fr"));
    return {
      verdict: "unconfirmed",
      headline: "Impossible de conseiller de rester sans confirmation",
      explanation: `Le parcours est partiellement documenté, mais ${missing.join(" et ")} reste à confirmer publiquement.`,
      action: `Obtenez une confirmation écrite sur ${missing.join(" et ")} avant de valider ce choix avec le client.`,
      tool,
      platform,
      lines,
    };
  }

  return {
    verdict: "keep",
    headline: "Vous pouvez conserver cet outil",
    explanation: "La plateforme agréée, la réception, l'émission et l'e-reporting sont documentés dans le périmètre étudié.",
    action: "Confirmez seulement l'activation du service et le tarif applicable au client. Les preuves retenues ne justifient pas un changement d'outil.",
    tool,
    platform,
    lines,
  };
}
