interface Exploration { title: string; heading: string; detail: string; directoryHref: string; directoryLabel: string; related: string[]; extraPlatforms?: string[] }

export const questionExploration: Record<string, Exploration> = {
  "plateforme-gratuite-sans-compte-bancaire": {
    title: "Plateforme agréée gratuite sans compte bancaire | PA Check",
    heading: "Comparer les conditions du gratuit",
    detail: "Pour départager les offres, rapprochez le public éligible, les volumes inclus et les fonctions payantes. Les fiches et le comparateur conservent les limites publiées pour chaque offre.",
    directoryHref: "/annuaire/#price=free&bank=no", directoryLabel: "Explorer les offres gratuites sans compte imposé",
    related: ["plateforme-pour-micro-entrepreneur", "cout-plateforme-sur-12-24-mois", "depassements-quotas-factures"],
  },
  "plateforme-pour-micro-entrepreneur": {
    title: "Quelle plateforme agréée pour un micro-entrepreneur ? | PA Check",
    heading: "Passer des pistes à votre sélection",
    detail: "Commencez par votre volume de factures et le travail éventuel avec un comptable. Comparez ensuite les offres retenues, leurs plafonds et leurs conditions de sortie.",
    directoryHref: "/annuaire/#target=micro", directoryLabel: "Explorer les PA pour indépendants",
    related: ["plateforme-gratuite-sans-compte-bancaire", "plateforme-pour-travailler-avec-comptable", "garder-son-logiciel-de-facturation"],
  },
  "envoyer-factur-x-sans-solution-compatible": {
    title: "Importer et envoyer un Factur-X déjà créé : quelles PA ? | PA Check",
    heading: "Comparer le parcours d’import, pas seulement le format",
    detail: "Examinez séparément l’import d’un fichier tiers, la conservation de l’XML et la ressaisie éventuelle. Une liste de formats pris en charge ne décrit pas à elle seule ce parcours. Les points non documentés restent à confirmer auprès de l’éditeur.",
    directoryHref: "/annuaire/#facturx=yes", directoryLabel: "Voir les imports Factur-X publiés",
    related: ["verifier-factur-x-avant-envoi", "plateforme-avec-api", "recuperer-ses-factures-en-changeant-de-plateforme"],
    extraPlatforms: ["b2brouter", "dext"],
  },
  "garder-son-logiciel-de-facturation": {
    title: "Facturation électronique : garder son logiciel actuel | PA Check",
    heading: "Identifier la PA associée à votre logiciel",
    detail: "Consultez la fiche de la plateforme liée à votre outil, puis confirmez votre édition, les fonctions incluses et l’activation pour votre entreprise. Vous pouvez comparer plusieurs PA avant de discuter des options avec votre éditeur.",
    directoryHref: "/annuaire/", directoryLabel: "Retrouver une PA dans l’annuaire",
    related: ["outil-absent-questions-a-poser-editeur", "fonction-disponible-beta-annoncee", "plateforme-avec-api"],
  },
};
