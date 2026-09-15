import { journey, quote } from "./journey-profiles-expanded.ts";

export const septemberJourneyProfiles = [
  journey({
    id: "blg", platformSlug: "blg", aliases: ["BLG", "blgCloud"],
    toolLabel: "blgCloud", toolDetail: "ERP métier et module de facturation électronique.",
    checkedAt: "2026-09-14", sourceIds: ["blg-pa-2026-09"],
    cost: quote(["blg-pa-2026-09"], "Demandez le prix du module PA, les volumes et les éventuels frais de raccordement à votre ERP blgCloud."),
  }),
  journey({
    id: "fiskaltrust", platformSlug: "fiskaltrust", aliases: ["fiskaltrust", "Fiskaltrust France"],
    toolLabel: "fiskaltrust", toolDetail: "Conformité fiscale pour logiciels de caisse et commerçants.",
    checkedAt: "2026-09-14", sourceIds: ["fiskaltrust-france-2026-09", "dgfip-list-2026-09-10"],
    cost: quote(["fiskaltrust-france-2026-09"], "Le middleware de caisse ne suffit pas à établir le tarif du service PA France. Demandez une offre précisant émission, réception, e-reporting et intégration."),
    after: [{ title: "Confirmez le service PA France", detail: "L'immatriculation est publiée. Faites préciser les fonctions déjà activables dans votre logiciel de caisse et leurs conditions commerciales.", sourceIds: ["dgfip-list-2026-09-10", "fiskaltrust-france-2026-09"] }],
  }),
];
