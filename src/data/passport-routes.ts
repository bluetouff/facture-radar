export type PassportEvidenceState = "documented" | "confirm" | "not_published";
export type PassportRouteState = "documented" | "constrained" | "unknown";

export interface PassportRouteFact {
  id: "entry" | "format" | "transmission" | "integrity";
  label: string;
  value: string;
  detail: string;
  state: PassportEvidenceState;
  sourceIds: string[];
}

export interface PassportRoute {
  slug: "qonto" | "pennylane" | "b2brouter" | "superpdp" | "tiime" | "abby";
  name: string;
  officialName: string;
  routeState: PassportRouteState;
  routeLabel: string;
  channel: string;
  summary: string;
  facts: PassportRouteFact[];
  cost: {
    value: string;
    detail: string;
    sourceIds: string[];
  };
  decisiveTest: string;
  nextStep: string;
  profileHref: string | null;
  checkedAt: string;
}

export const PASSPORT_LAB_VERSION = "PA Check Lab 0.1";
export const PASSPORT_LAB_CHECKED_AT = "2026-08-25";

export const passportRoutes: PassportRoute[] = [
  {
    slug: "qonto",
    name: "Qonto",
    officialName: "QONTO",
    routeState: "documented",
    routeLabel: "Parcours direct documenté",
    channel: "Interface web",
    summary: "Qonto documente l'import de factures électroniques existantes puis leur envoi depuis l'espace Factures clients.",
    facts: [
      {
        id: "entry",
        label: "Entrée du fichier",
        value: "Import dans Factures clients",
        detail: "Le centre d'aide accepte les factures électroniques importées aux formats Factur-X, UBL ou CII.",
        state: "documented",
        sourceIds: ["qonto-import-electronic-2026"],
      },
      {
        id: "format",
        label: "Factur-X tiers",
        value: "Accepté à l'import",
        detail: "Le format Factur-X figure explicitement parmi les formats électroniques importables.",
        state: "documented",
        sourceIds: ["qonto-import-electronic-2026"],
      },
      {
        id: "transmission",
        label: "Envoi électronique",
        value: "Depuis Qonto",
        detail: "La documentation relie la facture électronique importée à un envoi depuis la fiche de facture client.",
        state: "documented",
        sourceIds: ["qonto-import-electronic-2026", "qonto-flow-2026"],
      },
      {
        id: "integrity",
        label: "XML d'origine",
        value: "Conservation à contrôler",
        detail: "Les formats acceptés sont publiés, mais la conservation sans transformation du XML embarqué n'est pas décrite.",
        state: "confirm",
        sourceIds: ["qonto-import-electronic-2026"],
      },
    ],
    cost: {
      value: "0 € HT annoncé",
      detail: "La facturation électronique est annoncée gratuite, avec ou sans compte professionnel. Les services bancaires restent hors périmètre.",
      sourceIds: ["qonto-invoicing-2026", "qonto-billing-2026"],
    },
    decisiveTest: "Importer ce même fichier, contrôler les lignes et totaux repris, puis vérifier que Qonto le conserve comme Factur-X avant l'envoi.",
    nextStep: "Ouvrez Factures clients dans Qonto et utilisez l'import de facture électronique.",
    profileHref: "/plateformes/qonto/",
    checkedAt: PASSPORT_LAB_CHECKED_AT,
  },
  {
    slug: "pennylane",
    name: "Pennylane",
    officialName: "PENNYLANE",
    routeState: "constrained",
    routeLabel: "Parcours API documenté",
    channel: "API · plan Essentiel",
    summary: "Pennylane documente l'import d'un Factur-X produit par un autre outil et sa transmission ultérieure, avec une condition de plan pour l'API.",
    facts: [
      {
        id: "entry",
        label: "Entrée du fichier",
        value: "Import Factur-X par API",
        detail: "L'import API d'une facture client ou fournisseur Factur-X est documenté à partir du plan Essentiel.",
        state: "documented",
        sourceIds: ["pennylane-import-facturx-2026", "pennylane-formats-2026"],
      },
      {
        id: "format",
        label: "Factur-X tiers",
        value: "Lu par le parseur XML",
        detail: "Pennylane indique lire le XML structuré plutôt que de passer le document Factur-X par l'OCR.",
        state: "documented",
        sourceIds: ["pennylane-import-facturx-2026"],
      },
      {
        id: "transmission",
        label: "Envoi électronique",
        value: "Transmission documentée",
        detail: "La documentation précise que le fichier importé pourra ensuite être transmis à la plateforme de réception du client.",
        state: "documented",
        sourceIds: ["pennylane-import-facturx-2026"],
      },
      {
        id: "integrity",
        label: "XML d'origine",
        value: "Conservation à contrôler",
        detail: "La lecture du XML est documentée, pas sa conservation sans transformation jusqu'au destinataire.",
        state: "confirm",
        sourceIds: ["pennylane-import-facturx-2026"],
      },
    ],
    cost: {
      value: "À partir de 7 € HT/mois",
      detail: "Un plan gratuit existe pour certaines micro-entreprises. L'accès API dépend du plan Essentiel.",
      sourceIds: ["pennylane-main-2026", "pennylane-free-2026", "pennylane-import-facturx-2026"],
    },
    decisiveTest: "Faire importer ce fichier par l'API, puis comparer le PDF, le profil, les lignes, les totaux et l'identifiant de facture avant émission.",
    nextStep: "Si vous avez le plan Essentiel, demandez un import test via l'API e-invoice avant de modifier votre chaîne actuelle.",
    profileHref: "/plateformes/pennylane/",
    checkedAt: PASSPORT_LAB_CHECKED_AT,
  },
  {
    slug: "b2brouter",
    name: "B2Brouter",
    officialName: "B2BRouter",
    routeState: "constrained",
    routeLabel: "Portail simple, dernier mètre à tester",
    channel: "Portail web ou API",
    summary: "B2Brouter documente un portail direct, l'import PDF ou XML et Factur-X comme format d'entrée de son API française.",
    facts: [
      {
        id: "entry",
        label: "Entrée du fichier",
        value: "Portail ou API",
        detail: "Le portail public annonce l'import PDF ou XML et l'API France accepte Factur-X, UBL et CII.",
        state: "documented",
        sourceIds: ["b2brouter-free-2026", "b2brouter-france-api-2026"],
      },
      {
        id: "format",
        label: "Factur-X tiers",
        value: "Format accepté par l'API",
        detail: "Factur-X PDF/A-3 avec XML CII embarqué figure dans les formats d'entrée publiés pour la France.",
        state: "documented",
        sourceIds: ["b2brouter-france-api-2026"],
      },
      {
        id: "transmission",
        label: "Envoi électronique",
        value: "Routage pris en charge",
        detail: "B2Brouter documente la transmission et le suivi depuis sa plateforme agréée.",
        state: "documented",
        sourceIds: ["b2brouter-home-2026", "b2brouter-france-api-2026"],
      },
      {
        id: "integrity",
        label: "XML d'origine",
        value: "Portail à contrôler",
        detail: "Le chemin API est décrit, mais la conservation du XML d'un Factur-X tiers déposé dans le portail gratuit reste à tester.",
        state: "confirm",
        sourceIds: ["b2brouter-free-2026", "b2brouter-france-api-2026"],
      },
    ],
    cost: {
      value: "24 transactions/an gratuites",
      detail: "Le prix du parcours au-delà de ce volume doit être chiffré avant engagement.",
      sourceIds: ["b2brouter-home-2026"],
    },
    decisiveTest: "Déposer ce fichier dans le portail gratuit et vérifier qu'il reste identifié comme Factur-X avec ses données structurées, sans recréation.",
    nextStep: "Créez un compte de test et importez une seule facture non sensible avant de retenir cette route.",
    profileHref: null,
    checkedAt: PASSPORT_LAB_CHECKED_AT,
  },
  {
    slug: "superpdp",
    name: "SuperPDP",
    officialName: "SUPER PDP",
    routeState: "unknown",
    routeLabel: "Import direct à confirmer",
    channel: "Compte en ligne ou API",
    summary: "SuperPDP documente Factur-X et un compte en ligne direct, mais pas encore le dépôt d'un Factur-X déjà finalisé par un autre outil.",
    facts: [
      {
        id: "entry",
        label: "Entrée du fichier",
        value: "Compte direct documenté",
        detail: "L'utilisation du compte en ligne sans solution compatible intermédiaire est publiée.",
        state: "documented",
        sourceIds: ["superpdp-home-2026", "superpdp-production-2026"],
      },
      {
        id: "format",
        label: "Factur-X",
        value: "Format pris en charge",
        detail: "SuperPDP publie la prise en charge de Factur-X et des contrôles EN 16931.",
        state: "documented",
        sourceIds: ["superpdp-features-2026"],
      },
      {
        id: "transmission",
        label: "Envoi électronique",
        value: "Fonction documentée",
        detail: "L'émission et le suivi figurent parmi les fonctions du compte en ligne.",
        state: "documented",
        sourceIds: ["superpdp-home-2026", "superpdp-features-2026"],
      },
      {
        id: "integrity",
        label: "Factur-X tiers",
        value: "Information non publiée",
        detail: "Aucune source retenue ne décrit le bouton d'import ni la conservation du XML produit ailleurs.",
        state: "not_published",
        sourceIds: [],
      },
    ],
    cost: {
      value: "Jusqu'à 1 000 factures/mois gratuites",
      detail: "La vérification KYC ou KYB est affichée à 2 € HT. Une tarification API s'applique au-delà.",
      sourceIds: ["superpdp-pricing-2026"],
    },
    decisiveTest: "Demander si le compte accepte un PDF/A-3 Factur-X EN 16931 tiers et s'il transmet son XML sans le reconstruire.",
    nextStep: "Posez cette question précise à SuperPDP avant de déplacer votre facturation.",
    profileHref: "/plateformes/superpdp/",
    checkedAt: PASSPORT_LAB_CHECKED_AT,
  },
  {
    slug: "tiime",
    name: "Tiime",
    officialName: "TIIME PDP",
    routeState: "unknown",
    routeLabel: "Création dans Tiime documentée",
    channel: "Application Tiime",
    summary: "Tiime documente la création et l'envoi depuis son application. Le dépôt d'un Factur-X finalisé dans un autre outil n'est pas décrit.",
    facts: [
      {
        id: "entry",
        label: "Entrée du fichier",
        value: "Création dans Tiime",
        detail: "Le parcours public présente des factures créées dans Tiime Invoice.",
        state: "documented",
        sourceIds: ["tiime-pa-2026"],
      },
      {
        id: "format",
        label: "Factur-X tiers",
        value: "Information non publiée",
        detail: "Les sources retenues ne décrivent pas l'import d'une facture de vente Factur-X déjà finalisée.",
        state: "not_published",
        sourceIds: [],
      },
      {
        id: "transmission",
        label: "Envoi électronique",
        value: "Depuis Tiime",
        detail: "L'émission et la réception électroniques sont annoncées depuis l'application Tiime.",
        state: "documented",
        sourceIds: ["tiime-pa-2026"],
      },
      {
        id: "integrity",
        label: "XML d'origine",
        value: "Information non publiée",
        detail: "Aucun parcours public ne permet d'établir la conservation du XML d'un fichier tiers.",
        state: "not_published",
        sourceIds: [],
      },
    ],
    cost: {
      value: "0 € HT annoncé",
      detail: "La facturation électronique est annoncée gratuite et sans limite. Les modules optionnels restent hors périmètre.",
      sourceIds: ["tiime-pricing-2026", "tiime-pa-2026"],
    },
    decisiveTest: "Demander à Tiime si une facture de vente Factur-X créée ailleurs peut être déposée puis émise sans ressaisie.",
    nextStep: "Si vous souhaitez garder votre outil actuel, faites confirmer l'import d'un Factur-X tiers avant d'activer Tiime comme PA.",
    profileHref: "/plateformes/tiime/",
    checkedAt: PASSPORT_LAB_CHECKED_AT,
  },
  {
    slug: "abby",
    name: "Abby",
    officialName: "ABBY",
    routeState: "unknown",
    routeLabel: "Parcours externe non publié",
    channel: "Application Abby",
    summary: "Abby documente la création de factures dans son application. Sa documentation de migration ne décrit pas l'import automatique de factures externes finalisées.",
    facts: [
      {
        id: "entry",
        label: "Entrée du fichier",
        value: "Création dans Abby",
        detail: "Le parcours publié part d'une facture créée puis finalisée dans Abby.",
        state: "documented",
        sourceIds: ["abby-electronic-invoicing-2026"],
      },
      {
        id: "format",
        label: "Factur-X tiers",
        value: "Import non documenté",
        detail: "La documentation de migration indique que les anciennes factures ne sont pas importées automatiquement dans la facturation.",
        state: "confirm",
        sourceIds: ["abby-import-history-2026"],
      },
      {
        id: "transmission",
        label: "Envoi électronique",
        value: "Depuis Abby",
        detail: "Les fonctions de facturation électronique sont annoncées dans l'offre Abby.",
        state: "documented",
        sourceIds: ["abby-electronic-invoicing-2026", "abby-activation-2026"],
      },
      {
        id: "integrity",
        label: "XML d'origine",
        value: "Information non publiée",
        detail: "Aucun parcours public ne permet d'établir la conservation d'un XML Factur-X produit ailleurs.",
        state: "not_published",
        sourceIds: [],
      },
    ],
    cost: {
      value: "0 € HT annoncé",
      detail: "L'offre Basique annonce la facturation électronique gratuite et sans limitation. Les fonctions avancées restent hors périmètre.",
      sourceIds: ["abby-pricing-2026", "abby-electronic-invoicing-2026"],
    },
    decisiveTest: "Demander si Abby accepte une facture de vente Factur-X finalisée ailleurs et la transmet sans la recréer.",
    nextStep: "Si votre facture vient d'un autre outil, obtenez une réponse écrite d'Abby avant toute bascule.",
    profileHref: "/plateformes/abby/",
    checkedAt: PASSPORT_LAB_CHECKED_AT,
  },
];

export const passportRouteSourceIds = [...new Set(passportRoutes.flatMap((route) => [
  ...route.facts.flatMap((fact) => fact.sourceIds),
  ...route.cost.sourceIds,
]))];
