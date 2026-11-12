import { journey, paid, quote } from "./journey-profiles-expanded.ts";

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
}), ...[
  { id: "basikon" as const, name: "Basikon" },
  { id: "konica-minolta" as const, name: "Konica Minolta" },
  { id: "ponsot-conseil-gestion" as const, name: "Ponsot Conseil Gestion" },
  { id: "zefyr" as const, name: "Zefyr" },
].map(({ id, name }) => {
  const sources = id === "ponsot-conseil-gestion" ? ["ponsot-cgu-20261112"]
    : id === "zefyr" ? ["zefyr-pricing-20261112", "zefyr-faq-20261112"] : ["dgfip-list-20261112"];
  return journey({
  id, platformSlug: id, aliases: [name], toolLabel: name,
  toolDetail: "Admission dans la liste DGFiP ; parcours PA à confirmer auprès de l’opérateur.",
  checkedAt: "2026-11-12", sourceIds: sources,
  cost: id === "ponsot-conseil-gestion"
    ? paid(100 / 12, "Suite avocats Standard : 100 € HT/an pour une licence, ou 9,90 € HT/mois.", "L’équivalent mensuel correspond à un paiement annuel et à un engagement de douze mois. Offre réservée aux avocats et structures d’un barreau français ; API seule et modules complémentaires sur devis. Activation PA et volumes à confirmer.", sources)
    : id === "zefyr"
      ? paid(14, "Suite Zefyr avec facturation électronique : dès 14 € HT/mois.", "Tarif pour un chiffre d’affaires de 0 à 12 000 €, annualisé selon les règles de la FAQ. Les paliers supérieurs et certains modules augmentent le prix. Vérifiez votre tranche, les volumes et l’activation des fonctions PA.", sources)
      : quote(sources, "Faites préciser l’offre PA, les frais de mise en service, les volumes inclus et les modalités de sortie avant de choisir."),
});
})];
