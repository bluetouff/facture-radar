import type { Evidence, Platform, PlatformResearchProfile } from "../data/types.ts";
import { targetLabels } from "./explorer.ts";

export interface ComparisonFact { key: string; label: string; evidence: Evidence<unknown>; text: string }
const unknown = "À confirmer";
const yesNo = (value: boolean | null) => value === null ? unknown : value ? "Oui" : "Non";
const list = (value: string[] | null) => value?.length ? value.join(", ") : unknown;

export function comparisonFacts(platform: Platform, research: PlatformResearchProfile): ComparisonFact[] {
  const fact = (key: string, label: string, evidence: Evidence<unknown>, text: string): ComparisonFact => ({
    key, label, evidence, text: evidence.status === "non_documented" || evidence.value === null ? unknown : text,
  });
  const api = platform.publicApi.value;
  const direct = research.directImport.value;
  const iso = research.iso27001Scope.value;
  return [
    fact("target", "Public visé", { value: platform.targets, status: "declared", sourceIds: [], checkedAt: "", note: "Public décrit dans la fiche PA Check. À rapprocher des conditions de l’offre." }, platform.targets.map(target => targetLabels[target]).join(", ")),
    fact("price", "Prix et conditions", platform.pricing, platform.pricing.value?.label || unknown),
    fact("allowance", "Volume inclus", platform.allowance, platform.allowance.value?.label || unknown),
    fact("bank", "Compte bancaire obligatoire", platform.bankAccountRequired, yesNo(platform.bankAccountRequired.value)),
    fact("accountant", "Accès pour le comptable", platform.accountantAccess, yesNo(platform.accountantAccess.value)),
    fact("api", "API publique", platform.publicApi, !api ? unknown : !api.available ? "Non" : api.includedInFree === true ? "Oui, incluse dans l’offre gratuite" : api.includedInFree === false ? "Oui, offre payante" : "Oui, tarif à confirmer"),
    fact("import", "Import d’un fichier produit ailleurs", research.directImport, !direct ? unknown : !direct.acceptsThirdPartyFile ? "Non" : `Import publié : ${direct.formats.join(", ") || "formats à confirmer"}. XML embarqué conservé : ${yesNo(direct.preservesEmbeddedXml).toLowerCase()}. Ressaisie requise : ${yesNo(direct.requiresReentry).toLowerCase()}.`),
    fact("formats", "Formats de facture", platform.formats, list(platform.formats.value)),
    fact("integrations", "Intégrations", platform.integrations, list(platform.integrations.value)),
    fact("hosting", "Pays d’hébergement", platform.hostingCountries, list(platform.hostingCountries.value)),
    fact("iso", "Preuve publique ISO 27001", research.iso27001Scope, !iso ? unknown : `${iso.legalEntity || "Titulaire à confirmer"} · ${iso.scopeText || "Périmètre à confirmer"}${iso.validUntil ? ` · Fin de validité publiée : ${iso.validUntil.split("-").reverse().join("/")}` : " · Dates non publiées"}`),
    fact("commitment", "Engagement minimal", platform.commitmentMonths, platform.commitmentMonths.value === 0 ? "Sans engagement" : `${platform.commitmentMonths.value} mois`),
    fact("overage", "Coût des dépassements", research.overagePricing, research.overagePricing.value || unknown),
    fact("termination", "Résiliation", research.terminationTerms, research.terminationTerms.value || unknown),
    fact("export", "Export des données", platform.exportDocumented, yesNo(platform.exportDocumented.value)),
  ];
}

export function sameComparisonFact(facts: ComparisonFact[]): boolean {
  const first = facts[0];
  if (!first || facts.length < 2) return false;
  const signature = (fact: ComparisonFact) => JSON.stringify([fact.text, fact.evidence.value, fact.evidence.status, fact.evidence.note || ""]);
  return facts.every(fact => signature(fact) === signature(first));
}
