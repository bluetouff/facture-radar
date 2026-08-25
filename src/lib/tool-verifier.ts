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
    relationNote: "Cegid opère une plateforme agréée. Le produit, l'édition et l'activation inclus dans votre offre doivent encore être confirmés.",
  },
  {
    id: "ebp",
    label: "EBP",
    aliases: ["EBP Comptabilité", "EBP Gestion Commerciale"],
    platformSlug: "cegid",
    relation: "connected",
    relationNote: "L'intégration de l'environnement EBP à Cegid est indiquée dans la documentation. L'édition et l'activation incluses dans votre offre doivent encore être confirmées.",
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
    relationNote: "Sage opère une plateforme agréée intégrée à plusieurs offres. L'édition et l'activation du service doivent être confirmées pour votre entreprise.",
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
    relationNote: "Teogest figure dans l'écosystème Septeo. L'édition et l'activation de la plateforme agréée doivent encore être confirmées.",
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
    relationNote: "SAP opère une plateforme agréée. Son activation et son intégration dépendent de votre environnement SAP.",
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
    value: state === "yes" ? "Disponible" : state === "no" ? "Non couvert" : "À confirmer",
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
      headline: "Nous n'avons pas encore étudié cet outil",
      explanation: "Il n'apparaît pas dans notre sélection actuelle. Cela ne signifie pas qu'il n'est pas conforme.",
      action: "Demandez à l'éditeur quelle plateforme agréée sera utilisée et quand la réception, l'émission et l'e-reporting seront activés.",
      tool: null,
      platform: null,
      lines: [],
    };
  }

  const platform = platforms.find((candidate) => candidate.slug === tool.platformSlug) ?? null;
  if (!platform) {
    return {
      verdict: "unconfirmed",
      headline: "Cette fiche est momentanément indisponible",
      explanation: "Nous connaissons le lien avec une plateforme agréée, mais les informations utiles ne sont pas disponibles dans cette version du site.",
      action: "Demandez à l'éditeur de confirmer la plateforme agréée utilisée et les services inclus dans votre offre.",
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
      headline: "L'édition et l'activation restent à confirmer",
      explanation: tool.relationNote ?? "Cet outil est relié à une plateforme agréée. Les services inclus dans votre offre restent à confirmer.",
      action: `Demandez à l'éditeur de confirmer par écrit que votre offre active bien ${platform.displayName} pour la réception, l'émission et l'e-reporting.`,
      tool,
      platform,
      lines,
    };
  }

  if (lines.some((line) => line.state === "no")) {
    return {
      verdict: "act",
      headline: "Une vérification est nécessaire avant l'échéance",
      explanation: "Une fonction nécessaire est indiquée comme non couverte dans les informations consultées.",
      action: "Contactez l'éditeur pour faire activer la fonction manquante ou choisir une autre plateforme avant votre échéance.",
      tool,
      platform,
      lines,
    };
  }

  if (lines.some((line) => line.state === "unknown")) {
    const missing = lines.filter((line) => line.state === "unknown").map((line) => line.label.toLocaleLowerCase("fr"));
    return {
      verdict: "unconfirmed",
      headline: "Quelques points restent à confirmer",
      explanation: `Les informations disponibles ne permettent pas encore de confirmer ${missing.join(" et ")}.`,
      action: `Demandez à l'éditeur une confirmation écrite sur ${missing.join(" et ")} avant de vous engager.`,
      tool,
      platform,
      lines,
    };
  }

  return {
    verdict: "keep",
    headline: "Les fonctions essentielles sont documentées",
    explanation: "La plateforme agréée associée prend en charge la réception, l'émission et l'e-reporting dans les informations publiques consultées.",
    action: "Ouvrez votre offre pour contrôler que le service est actif et relever le tarif qui vous sera réellement appliqué.",
    tool,
    platform,
    lines,
  };
}
