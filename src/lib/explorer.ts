import type { Evidence, Platform, PlatformResearchProfile } from "../data/types.ts";

export const targetLabels = { micro: "Indépendants", tpe: "TPE", pme: "PME", eti: "ETI", ge: "Grands comptes" } as const;
export type FactState = "yes" | "no" | "unknown" | "declared";

export function factState(evidence: Evidence<unknown>, value: boolean | null | undefined): FactState {
  if (evidence.status === "non_documented" || evidence.value === null || value == null || !evidence.sourceIds.length) return "unknown";
  if (evidence.status === "declared") return "declared";
  return value ? "yes" : "no";
}

export function directoryFacts(platform: Platform, research: PlatformResearchProfile) {
  const direct = research.directImport;
  const importValue = direct.value?.acceptsThirdPartyFile === false ? false
    : direct.value?.acceptsThirdPartyFile && direct.value.formats.some(format => format.toLowerCase() === "factur-x") ? true : null;
  return {
    target: platform.targets.join(" "),
    price: platform.pricing.status === "non_documented" || !platform.pricing.value || !platform.pricing.sourceIds.length ? "unknown"
      : platform.pricing.status === "declared" ? "declared" : platform.pricing.value.kind,
    bank: factState(platform.bankAccountRequired, platform.bankAccountRequired.value),
    api: factState(platform.publicApi, platform.publicApi.value?.available),
    facturx: factState(direct, importValue),
  };
}

/** Only catalogue IDs can enter storage, URLs or the comparison. */
export function sanitizeSelection(value: unknown, allowed: ReadonlySet<string>): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.slice(0, 100).filter((id): id is string => typeof id === "string" && allowed.has(id)))].slice(0, 3);
}
