/** Editorial history of verified changes, independent of build and styling dates. */
export const platformUpdates = [
  { id: "blg-fiskaltrust-20260914", date: "2026-09-14", label: "Nouvelles PA", title: "BLG et Fiskaltrust rejoignent l’annuaire", detail: "Les deux entrées figurent parmi les plateformes approuvées dans le relevé DGFiP du 10 septembre. Leurs tarifs et conditions restent à documenter.", slugs: ["blg", "fiskaltrust"], sourceIds: ["dgfip-list-2026-09-10"] },
  { id: "b2brouter-prix-20260914", date: "2026-09-14", label: "Tarif actualisé", title: "B2Brouter : le périmètre France est payant", detail: "La conformité française est rattachée au plan Professional à 110 € HT par an. Le plan gratuit n’est pas présenté comme une solution gratuite pour ce périmètre.", slugs: ["b2brouter"], sourceIds: ["b2brouter-pricing-2026-09"] },
  { id: "lundi-matin-20260914", date: "2026-09-14", label: "Offres précisées", title: "Lundi Matin : PA seule, LMB et quotas distingués", detail: "Les offres PA seule et LMB sont documentées séparément. Les mouvements comptabilisés dans les quotas ne sont pas assimilés à un nombre de factures.", slugs: ["lundi-matin"], sourceIds: ["lundi-matin-pa-2026-09"] },
  { id: "pennylane-20260914", date: "2026-09-14", label: "Sources complétées", title: "Pennylane : hébergeurs PA et périmètre ISO précisés", detail: "Les hébergeurs déclarés pour la PA sont distingués des autres services. Le certificat public référencé indique une fin de validité au 19 septembre 2026 ; son renouvellement reste à vérifier.", slugs: ["pennylane"], sourceIds: ["pennylane-subprocessors-2026-09", "pennylane-iso27001-2026-09"] },
  { id: "doxallia-20260914", date: "2026-09-14", label: "Document ajouté", title: "Doxallia : le document HDS est identifié séparément", detail: "La nouvelle source HDS est reliée à la fiche. Elle ne remplace pas le certificat ISO 27001 détaillé déjà référencé.", slugs: ["doxallia"], sourceIds: ["doxallia-hds-2026-09"] },
] as const;

export function updatesForPlatform(slug: string) {
  return platformUpdates.filter(update => (update.slugs as readonly string[]).includes(slug));
}
