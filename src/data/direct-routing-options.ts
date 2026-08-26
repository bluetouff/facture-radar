export type DirectRoutingState = "documented" | "confirm" | "unknown";
export type DirectRoutingVolume = "up-to-24" | "25-to-1000" | "over-1000" | "unknown";

export interface DirectRoutingFact {
  label: string;
  value: string;
  state: DirectRoutingState;
  sourceIds: string[];
}

export interface DirectRoutingOption {
  id: "b2brouter" | "superpdp" | "dext";
  name: string;
  officialName: string;
  statusLabel: string;
  summary: string;
  facts: DirectRoutingFact[];
  priceByVolume: Record<DirectRoutingVolume, string>;
  priceSourceIds: string[];
  decisiveUnknown: string;
  nextStep: string;
  profileHref: string | null;
}

const officialSourceIds = ["dgfip-list-2026-08-19"];

export const directRoutingOptions: DirectRoutingOption[] = [
  {
    id: "b2brouter",
    name: "B2Brouter",
    officialName: "B2BRouter",
    statusLabel: "Piste la plus documentée",
    summary: "Son portail public réunit l'import de factures PDF ou XML et l'envoi de factures électroniques depuis la PA elle-même.",
    facts: [
      {
        label: "PA immatriculée",
        value: "Oui",
        state: "documented",
        sourceIds: officialSourceIds,
      },
      {
        label: "Accès direct, sans SC imposée",
        value: "Portail web",
        state: "documented",
        sourceIds: ["b2brouter-home-2026"],
      },
      {
        label: "Import d'un fichier existant",
        value: "PDF ou XML",
        state: "documented",
        sourceIds: ["b2brouter-free-2026"],
      },
      {
        label: "Factur-X tiers conservé de bout en bout",
        value: "À tester",
        state: "confirm",
        sourceIds: ["b2brouter-free-2026", "b2brouter-facturx-validator-2026"],
      },
    ],
    priceByVolume: {
      "up-to-24": "Jusqu'à 24 transactions par an incluses gratuitement",
      "25-to-1000": "Le tarif au-delà de 24 transactions par an doit être chiffré",
      "over-1000": "Tarif à demander selon le volume et le mode de raccordement",
      unknown: "Gratuit jusqu'à 24 transactions par an, tarif supérieur à confirmer",
    },
    priceSourceIds: ["b2brouter-home-2026"],
    decisiveUnknown: "La documentation ne dit pas explicitement si l'import d'un PDF/A-3 Factur-X tiers conserve son XML EN16931 jusqu'à l'émission, sans ressaisie.",
    nextStep: "Demandez à B2Brouter de confirmer par écrit que le portail conserve le XML EN16931 du fichier sans ressaisie.",
    profileHref: null,
  },
  {
    id: "superpdp",
    name: "SuperPDP",
    officialName: "SUPER PDP",
    statusLabel: "Alternative très crédible",
    summary: "Le compte en ligne est utilisable directement et la plateforme documente Factur-X ainsi que la validation EN16931.",
    facts: [
      {
        label: "PA immatriculée",
        value: "Oui",
        state: "documented",
        sourceIds: officialSourceIds,
      },
      {
        label: "Accès direct, sans SC imposée",
        value: "Compte en ligne",
        state: "documented",
        sourceIds: ["superpdp-home-2026", "superpdp-production-2026"],
      },
      {
        label: "Factur-X et règles EN16931",
        value: "Documentés",
        state: "documented",
        sourceIds: ["superpdp-features-2026"],
      },
      {
        label: "Dépôt d'un Factur-X déjà produit",
        value: "Non documenté publiquement",
        state: "unknown",
        sourceIds: ["superpdp-production-2026"],
      },
    ],
    priceByVolume: {
      "up-to-24": "Compte gratuit, dans la limite de 1 000 factures par mois",
      "25-to-1000": "Compte gratuit, dans la limite de 1 000 factures par mois",
      "over-1000": "Bascule vers la tarification API au-delà de 1 000 factures par mois",
      unknown: "Compte gratuit jusqu'à 1 000 factures par mois, KYC/KYB affiché à 2 € HT",
    },
    priceSourceIds: ["superpdp-pricing-2026"],
    decisiveUnknown: "Le site public permet d'établir l'envoi depuis un compte et la prise en charge de Factur-X, mais pas encore le bouton d'import d'un fichier tiers déjà finalisé.",
    nextStep: "Avant de changer quoi que ce soit, demandez si le compte accepte un PDF/A-3 Factur-X EN16931 généré par un logiciel tiers, sans recréer la facture.",
    profileHref: "/plateformes/superpdp/",
  },
  {
    id: "dext",
    name: "Dext",
    officialName: "DEXT",
    statusLabel: "Parcours importé à confirmer",
    summary: "Dext documente l'import de factures de vente et leur envoi électronique via sa propre PA.",
    facts: [
      {
        label: "PA immatriculée",
        value: "Oui",
        state: "documented",
        sourceIds: officialSourceIds,
      },
      {
        label: "Accès direct, sans SC imposée",
        value: "Espace Dext",
        state: "documented",
        sourceIds: ["dext-send-electronic-2026"],
      },
      {
        label: "Import d'une facture de vente",
        value: "Web, e-mail ou mobile",
        state: "documented",
        sourceIds: ["dext-add-documents-2026"],
      },
      {
        label: "XML EN16931 du fichier tiers conservé",
        value: "Non précisé",
        state: "unknown",
        sourceIds: ["dext-send-electronic-2026"],
      },
    ],
    priceByVolume: {
      "up-to-24": "Tarif de ce parcours non publié dans les sources retenues",
      "25-to-1000": "Tarif de ce parcours non publié dans les sources retenues",
      "over-1000": "Tarif de ce parcours non publié dans les sources retenues",
      unknown: "Tarif de ce parcours non publié dans les sources retenues",
    },
    priceSourceIds: ["dext-send-electronic-2026"],
    decisiveUnknown: "Les pages d'aide relient bien les factures importées au suivi PA, mais elles décrivent surtout le Factur-X créé dans Dext, pas la conservation d'un Factur-X produit ailleurs.",
    nextStep: "Faites confirmer par Dext que l'import d'une vente conserve l'XML embarqué d'origine et n'impose ni recréation ni conversion OCR.",
    profileHref: null,
  },
];

export const directRoutingSourceIds = [...new Set(directRoutingOptions.flatMap((option) => [
  ...option.facts.flatMap((fact) => fact.sourceIds),
  ...option.priceSourceIds,
]))];
