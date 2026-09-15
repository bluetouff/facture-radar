import { expand } from "./platforms-expanded.ts";
import type { Evidence, Platform } from "./types.ts";

const checkedAt = "2026-09-14";
const documented = <T>(value: T, sourceIds: string[]): Evidence<T> => ({
  value, status: "documented", sourceIds, checkedAt,
});

export const septemberPlatforms: Platform[] = [
  expand({
    slug: "blg", displayName: "blgCloud", officialName: "BLG", registeredAt: "2026-08-26",
    summary: "PA intégrée à un ERP pour concessionnaires, loueurs et réparateurs de matériels.",
    targets: ["tpe", "pme", "eti", "ge"], ecosystem: ["blgCloud", "ERP", "location", "vente", "SAV"],
    sendsInvoices: documented(true, ["blg-pa-2026-09"]),
    receivesInvoices: documented(true, ["blg-pa-2026-09"]),
    eReporting: documented(true, ["blg-pa-2026-09"]),
    importantUnknowns: ["Prix et volumes du module PA", "Activation selon le contrat", "Formats et import tiers", "API, hébergement et sortie"],
  }),
  expand({
    slug: "fiskaltrust", displayName: "fiskaltrust", officialName: "FISKALTRUST", registeredAt: "2026-08-28",
    summary: "Infrastructure de conformité fiscale pour logiciels de caisse, intégrateurs et commerçants ; service PA France à préciser.",
    targets: ["tpe", "pme", "eti", "ge"], ecosystem: ["logiciels de caisse", "POS", "intégrateurs", "commerce"],
    importantUnknowns: ["Disponibilité de chaque fonction PA France", "Prix et volumes PA", "Formats et API de la PA", "Hébergement et restitution"],
  }),
].map((platform) => {
  // These are new reviews, including the explicit gaps in the public sources.
  for (const value of Object.values(platform)) {
    if (value && typeof value === "object" && "checkedAt" in value) value.checkedAt = checkedAt;
  }
  return platform;
});
