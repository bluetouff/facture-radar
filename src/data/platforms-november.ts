import { expand } from "./platforms-expanded.ts";
import type { Platform } from "./types.ts";

const checkedAt = "2026-11-01";
const officialSource = "dgfip-list-20261101";

export const novemberPlatforms: Platform[] = [
  expand({
    slug: "swile", displayName: "Swile", officialName: "SWILE", registeredAt: "En attente",
    summary: "Swile figure dans la liste des PA agréées. Son site présente les avantages salariés et les déplacements professionnels ; l’offre PA et ses conditions d’accès restent à documenter.",
    targets: [], ecosystem: [],
    importantUnknowns: ["Périmètre de l’offre PA", "Émission, réception et e-reporting opérationnels", "Tarifs, volumes et activation", "API, formats, hébergement et restitution"],
  }),
].map(platform => {
  for (const value of Object.values(platform)) {
    if (value && typeof value === "object" && "checkedAt" in value) value.checkedAt = checkedAt;
  }
  platform.officialStatus.sourceIds = [officialSource];
  platform.registeredAt.sourceIds = [officialSource];
  platform.registeredAt.note = "Le fichier officiel consulté le 1er novembre classe SWILE parmi les PA agréées et affiche En attente dans la colonne date d’immatriculation. La date précise reste inconnue.";
  return platform;
});
