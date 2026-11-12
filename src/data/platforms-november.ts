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
  platform.registeredAt = { value: "2026-11-02", status: "official", sourceIds: ["dgfip-list-20261112"], checkedAt: "2026-11-12", note: "Le relevé du 12 novembre précise la date auparavant indiquée En attente." };
  return platform;
});

/** Admissions présentes dans le relevé DGFiP du 12 novembre. */
export const november12Platforms: Platform[] = [
  expand({
    slug: "basikon", displayName: "Basikon", officialName: "Basikon", registeredAt: "En attente",
    summary: "Acteur des logiciels de financement désormais présent dans la liste des PA agréées. Le périmètre et les conditions de son offre PA restent à préciser.",
    targets: [], ecosystem: [], importantUnknowns: ["Offre PA et activation", "Prix et volumes", "Fonctions disponibles en production", "API, hébergement et restitution"],

"iso27001": {"value":true,"status":"documented","sourceIds":["basikon-bsi-20261112"],"checkedAt":"2026-11-12","note":"Le registre BSI confirme IS 835710, valable du 3 février 2026 au 2 février 2029, pour la conception, le développement et l’exploitation de la plateforme SaaS Basikon. Il ne nomme pas expressément la PA française."}
}),
  expand({
    slug: "konica-minolta", displayName: "Konica Minolta", officialName: "Konica Minolta Business Solutions France", registeredAt: "2026-11-03",
    summary: "Entrée propre à Konica Minolta dans l’annuaire des PA. La documentation KOMI Doc décrit aussi une offre distribuée avec Open Bee ; le contrat doit préciser l’opérateur retenu.",
    targets: [], ecosystem: [], importantUnknowns: ["Rattachement entre KOMI Doc et cette entrée PA", "Prix et volumes", "API et conditions d’accès", "Hébergement et restitution"],
  }),
  expand({
    slug: "ponsot-conseil-gestion", displayName: "Ponsot Conseil Gestion", officialName: "Ponsot Conseil Gestion", registeredAt: "En attente",
    summary: "Suite de gestion réservée aux avocats et structures inscrits à un barreau français, avec facturation Factur-X et raccordement API seul sur devis.",
    targets: [], ecosystem: [], importantUnknowns: ["E-reporting opérationnel","Volumes de factures inclus","Accès expert-comptable","Formats de restitution complète","Conditions de l’API","Périmètre du certificat contrôlé auprès d’AFNOR"],

"pricing": {"value":{"kind":"paid","monthlyFrom":8.333333333333334,"unit":"subscription","freeFor":[],"promotionalPriceExcluded":true,"label":"Standard : 100 € HT/an pour une licence, soit 8,33 € HT/mois en équivalent annuel ; ou 9,90 € HT/mois. Essai 90 jours exclu."},"status":"documented","sourceIds":["ponsot-cgu-20261112"],"checkedAt":"2026-11-12","note":"Le tarif annuel est payé sur une période d’un an. Premium : 49,90 € HT/mois ou 500 € HT/an pour trois licences. Licence additionnelle : 9,90 € HT/mois ou 100 € HT/an. Certains modules sur devis ont un engagement annuel distinct."},
"sendsInvoices": {"value":null,"status":"non_documented","sourceIds":[],"checkedAt":"2026-11-12","note":"Le contrat décrit cette fonction après vérification du cabinet et mandat PA. Le parcours de mise en service et sa disponibilité en production restent à confirmer."},
"receivesInvoices": {"value":null,"status":"non_documented","sourceIds":[],"checkedAt":"2026-11-12","note":"Le contrat décrit cette fonction après vérification du cabinet et mandat PA. Le parcours de mise en service et sa disponibilité en production restent à confirmer."},
"publicApi": {"value":{"available":true,"includedInFree":false},"status":"documented","sourceIds":["ponsot-home-20261112"],"checkedAt":"2026-11-12","note":"La FAQ décrit un raccordement du logiciel de cabinet en API sur devis. Documentation technique, conditions d’accès et fonctions ouvertes en production à confirmer."},
"exportDocumented": {"value":true,"status":"documented","sourceIds":["ponsot-cgu-20261112"],"checkedAt":"2026-11-12","note":"Restitution en format structuré prévue à l’annexe 1, point 9. Les formats précis, le périmètre exhaustif et les frais éventuels restent à confirmer."},
"formats": {"value":["Factur-X"],"status":"documented","sourceIds":["ponsot-home-20261112"],"checkedAt":"2026-11-12","note":"Format de génération des factures de la suite ; la matrice de réception et de l’API reste à préciser."},
"hostingCountries": {"value":["France"],"status":"declared","sourceIds":["ponsot-cgu-20261112"],"checkedAt":"2026-11-12","note":"Le contrat nomme Scalingo pour la production, sur une région 3DS Outscale annoncée qualifiée SecNumCloud. Le déploiement exact reste une déclaration de l’éditeur."},
"iso27001": {"value":true,"status":"declared","sourceIds":["ponsot-security-20261112"],"checkedAt":"2026-11-12","note":"Certificat AFAQ 2026/118813.1 annoncé par l’éditeur jusqu’au 22 juillet 2029. Le lien AFNOR répond HTTP 200 avec une erreur Report Viewer : le certificat de l’organisme n’a pas pu être vérifié."},
"commitmentMonths": {"value":12,"status":"documented","sourceIds":["ponsot-cgu-20261112"],"checkedAt":"2026-11-12","note":"Valeur pour l’option annuelle au prix de 100 € HT. Une formule mensuelle est aussi proposée. Résiliation à tout moment, effective au terme payé, sans remboursement partiel."}
}),
  expand({
    slug: "zefyr", displayName: "Zefyr", officialName: "ZEFYR", registeredAt: "En attente",
    summary: "Suite de comptabilité et de gestion avec facturation électronique incluse. Le tarif dépend du chiffre d’affaires ; la disponibilité détaillée des flux PA reste à préciser.",
    targets: [], ecosystem: [], importantUnknowns: ["Disponibilité opérationnelle des flux PA","Volumes inclus et dépassements","API et formats réglementaires","Certificat ISO applicable","Restitution après résiliation"],

"pricing": {"value":{"kind":"included","monthlyFrom":14,"unit":"subscription","freeFor":[],"promotionalPriceExcluded":true,"label":"Facturation électronique incluse dans la suite, dès 14 € HT/mois pour un CA de 0 à 12 000 €"},"status":"documented","sourceIds":["zefyr-pricing-20261112"],"checkedAt":"2026-11-12","note":"Les paliers suivants affichés sont 25 € HT/mois pour 12–50 k€, 35 € pour 50–100 k€ et 45 € pour 100–200 k€. Le CA de référence inclut les revenus financiers et peut être annualisé selon la FAQ. Essai de 30 jours exclu ; paie/DSN et liasse fiscale peuvent ajouter des frais."},
"accountantAccess": {"value":true,"status":"documented","sourceIds":["zefyr-pricing-20261112"],"checkedAt":"2026-11-12","note":"L’éditeur annonce des accès utilisateurs et expert-comptable sans supplément, avec habilitations individuelles."},
"hostingCountries": {"value":["France"],"status":"declared","sourceIds":["zefyr-faq-20261112"],"checkedAt":"2026-11-12","note":"La FAQ nomme Alpilink à Grenoble pour l’hébergement ; le périmètre contractuel de la PA reste à vérifier."},
"commitmentMonths": {"value":0,"status":"documented","sourceIds":["zefyr-pricing-20261112"],"checkedAt":"2026-11-12","note":"La page tarifaire annonce une résiliation à tout moment par message au support. Les prélèvements sont mensuels."},
"exportDocumented": {"value":true,"status":"documented","sourceIds":["zefyr-faq-20261112"],"checkedAt":"2026-11-12","note":"La FAQ invite à exporter les données avant la résiliation. Formats, exhaustivité et accès après clôture restent à préciser."}
}),
].map(platform => {
  for (const value of Object.values(platform)) {
    if (value && typeof value === "object" && "checkedAt" in value) value.checkedAt = "2026-11-12";
  }
  platform.officialStatus.sourceIds = ["dgfip-list-20261112"];
  platform.registeredAt.sourceIds = ["dgfip-list-20261112"];
  platform.registeredAt.note = platform.registeredAt.value === "En attente"
    ? "La DGFiP classe cet acteur parmi les PA agréées, avec En attente dans la colonne date. La date précise demeure inconnue."
    : "Date reproduite du relevé DGFiP du 12 novembre 2026.";
  return platform;
});
