import type { DiagnosticInput, Evidence, MatchResult, Platform } from "../data/types.ts";
import { documentationCoverage } from "./evidence.ts";

function trustedValue<T>(evidence: Evidence<T>): T | null {
  if (evidence.value === null) return null;
  if (evidence.sourceIds.length === 0) return null;
  return evidence.status === "official" || evidence.status === "documented" ? evidence.value : null;
}

function annualCost(platform: Platform): number | null {
  const pricing = trustedValue(platform.pricing);
  if (!pricing || pricing.monthlyFrom === null) return null;
  return Math.round(pricing.monthlyFrom * 12 * 100) / 100;
}

function freeCapacityFits(platform: Platform, monthlyInvoices: number): boolean | null {
  const allowance = trustedValue(platform.allowance);
  if (!allowance) return null;
  if (allowance.unlimited) return true;
  if (allowance.monthlyInvoices !== null) return monthlyInvoices <= allowance.monthlyInvoices;
  if (allowance.annualInvoices !== null) return monthlyInvoices * 12 <= allowance.annualInvoices;
  return null;
}

function addUnknownOrBlock(
  evidence: Evidence<boolean>,
  label: string,
  blockers: string[],
  unknowns: string[],
): boolean {
  const evidenceValue = trustedValue(evidence);
  if (evidenceValue === true) return true;
  if (evidenceValue === false) {
    blockers.push(label);
    return false;
  }
  blockers.push(`${label} : preuve publique manquante`);
  unknowns.push(label);
  return false;
}

export function matchPlatform(platform: Platform, input: DiagnosticInput): MatchResult {
  const blockers: string[] = [];
  const reasons: string[] = [];
  const unknowns: string[] = [];
  let preferencePoints = 0;
  let preferenceTotal = 0;

  if (!platform.targets.includes(input.size)) {
    blockers.push("La taille d'entreprise n'appartient pas à la cible documentée");
  } else {
    reasons.push("Cible compatible avec la taille déclarée");
  }

  const pricing = trustedValue(platform.pricing);
  const capacityFits = freeCapacityFits(platform, input.monthlyInvoices);
  if (input.freeOnly) {
    if (!pricing || pricing.kind !== "free" || !pricing.freeFor.includes(input.size)) {
      blockers.push("Aucun parcours gratuit documenté pour ce profil");
    } else if (capacityFits === false) {
      blockers.push("Le volume dépasse le plafond gratuit documenté");
    } else if (capacityFits === null) {
      blockers.push("Le plafond du parcours gratuit n'est pas documenté");
      unknowns.push("Plafond du parcours gratuit");
    } else {
      reasons.push("Parcours gratuit documenté pour ce profil et ce volume");
    }
  } else if (capacityFits === false) {
    unknowns.push("Tarif applicable au-delà du volume inclus");
  }

  if (input.noBankAccount) {
    const bankRequirement = trustedValue(platform.bankAccountRequired);
    if (bankRequirement === false) reasons.push("Aucun compte bancaire requis dans le parcours documenté");
    else if (bankRequirement === true) blockers.push("Un compte bancaire est requis");
    else {
      blockers.push("Absence de compte bancaire requis : preuve publique manquante");
      unknowns.push("Compte bancaire requis ou non");
    }
  }

  if (input.needsAccountantAccess) {
    if (addUnknownOrBlock(platform.accountantAccess, "Accès expert-comptable", blockers, unknowns)) {
      reasons.push("Accès expert-comptable documenté");
    }
  }

  if (input.needsApi) {
    const api = trustedValue(platform.publicApi);
    if (!api?.available) {
      blockers.push(api === null ? "API publique : preuve publique manquante" : "API publique non disponible");
      if (api === null) unknowns.push("API publique");
    } else if (input.freeOnly && api.includedInFree !== true) {
      blockers.push("API incluse dans le parcours gratuit : non documenté");
      unknowns.push("Coût d'accès à l'API");
    } else {
      reasons.push("API publique documentée");
    }
  }

  if (input.needsInternationalReporting) {
    if (addUnknownOrBlock(platform.eReporting, "E-reporting B2C et international", blockers, unknowns)) {
      reasons.push("E-reporting documenté");
    }
  }

  for (const priority of input.priorities) {
    preferenceTotal += 1;
    if (priority === "simplicity" && platform.targets.includes("micro") && pricing?.monthlyFrom === 0) {
      preferencePoints += 1;
      reasons.push("Parcours de base gratuit et ciblé petites structures");
    }
    if (priority === "ecosystem" && platform.ecosystem.length >= 3) {
      preferencePoints += 1;
      reasons.push("Écosystème d'intégrations documenté");
    }
    if (priority === "documentation" && documentationCoverage(platform) >= 60) {
      preferencePoints += 1;
      reasons.push("Couverture documentaire supérieure ou égale à 60 %");
    }
    if (priority === "reversibility" && trustedValue(platform.exportDocumented) === true && trustedValue(platform.commitmentMonths) === 0) {
      preferencePoints += 1;
      reasons.push("Export documenté et absence d'engagement dans le parcours étudié");
    }
  }

  const mandatoryTotal = 1 + Number(input.freeOnly) + Number(input.noBankAccount)
    + Number(input.needsAccountantAccess) + Number(input.needsApi) + Number(input.needsInternationalReporting);
  const mandatoryMet = Math.max(0, mandatoryTotal - blockers.length);
  const denominator = mandatoryTotal + preferenceTotal;
  const compatibility = denominator === 0 ? 0 : Math.round(((mandatoryMet + preferencePoints) / denominator) * 100);

  return {
    platform,
    eligible: blockers.length === 0,
    compatibility,
    reasons,
    blockers,
    unknowns: [...new Set(unknowns)],
    annualCost: annualCost(platform),
  };
}

export function runDiagnostic(platforms: Platform[], input: DiagnosticInput): MatchResult[] {
  return platforms
    .map((platform) => matchPlatform(platform, input))
    .sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      if (b.compatibility !== a.compatibility) return b.compatibility - a.compatibility;
      return a.platform.displayName.localeCompare(b.platform.displayName, "fr");
    });
}
