import { journey, quote } from "./journey-profiles-expanded.ts";

const sourceIds = ["dgfip-list-20261101", "swile-home-20261101"];

export const novemberJourneyProfiles = [journey({
  id: "swile", platformSlug: "swile", aliases: ["Swile"], toolLabel: "Swile",
  toolDetail: "Entrée de la liste DGFiP ; offre PA et parcours d’activation à préciser.",
  checkedAt: "2026-11-01", sourceIds,
  cost: quote(sourceIds, "Demandez le tarif de l’offre PA, les volumes inclus, les frais d’activation et les conditions de sortie. Les tarifs des avantages salariés ne renseignent pas le coût de la PA."),
  activation: {
    question: "Swile a-t-il confirmé le rattachement de votre entreprise à son offre PA ?",
    todo: "Demandez le périmètre de l’offre et sa procédure d’activation pour votre entreprise.",
    open: "Contactez Swile pour identifier le service PA proposé et ses conditions d’accès.",
    activate: "Faites confirmer les pièces, étapes et fonctions disponibles pour votre SIREN.",
    check: "Vérifiez le rattachement et l’adresse de réception dans l’annuaire avant de tester les échanges.",
    sourceIds,
  },
})];
