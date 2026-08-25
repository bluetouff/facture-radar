import type { Evidence, EvidenceStatus, Platform } from "../data/types.ts";

export const evidenceLabels: Record<EvidenceStatus, string> = {
  official: "Officiel",
  documented: "Documenté",
  declared: "Déclaré",
  non_documented: "Non documenté",
};

const criticalEvidenceKeys = [
  "pricing",
  "allowance",
  "sendsInvoices",
  "receivesInvoices",
  "eReporting",
  "bankAccountRequired",
  "accountantAccess",
  "publicApi",
  "exportDocumented",
  "integrations",
  "formats",
  "hostingCountries",
  "iso27001",
  "commitmentMonths",
] as const;

export function isKnown(evidence: Evidence<unknown>): boolean {
  return evidence.status !== "non_documented" && evidence.value !== null;
}

export function documentationCoverage(platform: Platform): number {
  const known = criticalEvidenceKeys.filter((key) => isKnown(platform[key])).length;
  return Math.round((known / criticalEvidenceKeys.length) * 100);
}

export function sourceCount(platform: Platform): number {
  const ids = new Set<string>();
  for (const key of criticalEvidenceKeys) {
    for (const sourceId of platform[key].sourceIds) ids.add(sourceId);
  }
  for (const sourceId of platform.officialStatus.sourceIds) ids.add(sourceId);
  return ids.size;
}
