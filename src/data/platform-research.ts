import { platforms } from "./platforms.ts";
import type {
  CapabilityAvailability,
  DirectImportDetail,
  Evidence,
  ExitTerms,
  PlatformResearchProfile,
} from "./types.ts";

export const PLATFORM_RESEARCH_CHECKED_AT = "2026-08-27";

const documented = <T>(value: T, sourceIds: string[], note?: string): Evidence<T> => ({
  value,
  status: "documented",
  sourceIds,
  checkedAt: PLATFORM_RESEARCH_CHECKED_AT,
  note,
});

const declared = <T>(value: T, sourceIds: string[], note?: string): Evidence<T> => ({
  value,
  status: "declared",
  sourceIds,
  checkedAt: PLATFORM_RESEARCH_CHECKED_AT,
  note,
});

const unknown = <T>(note: string): Evidence<T> => ({
  value: null,
  status: "non_documented",
  sourceIds: [],
  checkedAt: PLATFORM_RESEARCH_CHECKED_AT,
  note,
});

const available = (scope: string, sourceIds: string[], note?: string): Evidence<CapabilityAvailability> =>
  documented({ stage: "available", scope }, sourceIds, note);

type ResearchOverride = Partial<Omit<PlatformResearchProfile, "platformSlug" | "availability">> & {
  availability?: Partial<PlatformResearchProfile["availability"]>;
};

const researchOverrides: Readonly<Record<string, ResearchOverride>> = {
  abby: {
    availability: {
      sendsInvoices: available("Offre de facturation électronique Abby", ["abby-electronic-invoicing-2026"]),
      receivesInvoices: available("Offre de facturation électronique Abby", ["abby-electronic-invoicing-2026"]),
      eReporting: available("Offre de facturation électronique Abby", ["abby-electronic-invoicing-2026"]),
    },
    terminationTerms: documented("Offre Basique annoncée gratuite et sans engagement.", ["abby-pricing-2026"]),
  },
  b2brouter: {
    availability: {
      sendsInvoices: available("Plans Professional et Business pour la conformité française", ["b2brouter-pricing-2026"]),
      receivesInvoices: available("Plans Professional et Business pour la conformité française", ["b2brouter-pricing-2026"]),
      eReporting: available("Plans Professional et Business pour la conformité française", ["b2brouter-pricing-2026", "b2brouter-france-api-2026"]),
    },
    directImport: documented<DirectImportDetail>({
      acceptsThirdPartyFile: true,
      formats: ["PDF", "XML"],
      preservesEmbeddedXml: null,
      requiresReentry: null,
    }, ["b2brouter-free-2026", "b2brouter-pricing-2026"], "Import manuel publié. La conservation de l'XML embarqué dans un Factur-X tiers et l'absence de ressaisie ne sont pas précisées."),
    terminationTerms: documented("Le plan peut être modifié depuis le compte et le renouvellement automatique peut être désactivé. Les modalités de remboursement ne sont pas publiées dans la page tarifaire.", ["b2brouter-pricing-2026"]),
  },
  dext: {
    availability: {
      sendsInvoices: available("Compte de facturation électronique Dext", ["dext-pa-2026", "dext-send-electronic-2026"]),
      receivesInvoices: available("Compte de facturation électronique Dext", ["dext-pa-2026"]),
      eReporting: available("Compte de facturation électronique Dext", ["dext-pa-2026"]),
    },
    directImport: documented<DirectImportDetail>({
      acceptsThirdPartyFile: true,
      formats: ["PDF", "image"],
      preservesEmbeddedXml: null,
      requiresReentry: null,
    }, ["dext-add-documents-2026", "dext-send-electronic-2026"], "L'ajout de documents et l'envoi par la PA sont décrits. Le traitement d'un Factur-X tiers et de son XML embarqué n'est pas précisé."),
    terminationTerms: documented("Le compte gratuit n'impose pas d'engagement. Les conditions applicables aux offres payantes dépendent de l'abonnement.", ["dext-pricing-2026"]),
  },
  "fiducial-cloud": {
    availability: {
      sendsInvoices: available("Module Facilia Ventes", ["fiducial-pricing-2026"]),
      receivesInvoices: available("Module Facilia Achats", ["fiducial-pricing-2026"]),
    },
    overagePricing: documented("0,15 € HT par facture électronique reçue. Les paiements ou encaissements en ligne optionnels sont annoncés à 0,50 € HT par opération.", ["fiducial-pricing-2026"]),
    exitTerms: documented<ExitTerms>({
      bulkExport: null,
      formats: [],
      postTerminationAccess: null,
      fees: null,
    }, ["fiducial-pricing-2026"], "Un export des données financières est publié, sans inventaire complet des fichiers remis au départ."),
    terminationTerms: documented("Abonnement mensuel sans engagement, reconduit tacitement chaque mois et résiliable à tout moment.", ["fiducial-pricing-2026"]),
  },
  fulll: {
    availability: {
      sendsInvoices: available("Conformité Flash et environnement fulll", ["fulll-pa-2026"]),
      receivesInvoices: available("Conformité Flash et environnement fulll", ["fulll-pa-2026"]),
      eReporting: available("Conformité Flash et environnement fulll", ["fulll-pa-2026"]),
    },
    exitTerms: documented<ExitTerms>({
      bulkExport: null,
      formats: ["factures réglementaires"],
      postTerminationAccess: null,
      fees: null,
    }, ["fulll-pa-2026"], "Le téléchargement et la portabilité sont annoncés, mais la procédure de sortie, le délai et le coût ne sont pas publiés."),
  },
  indy: {
    availability: {
      sendsInvoices: available("Service de facturation Indy", ["indy-invoicing-2026"]),
      receivesInvoices: available("Service de facturation Indy", ["indy-invoicing-2026"]),
      eReporting: available("Service de facturation Indy", ["indy-invoicing-2026"]),
    },
    terminationTerms: documented("Service de facturation électronique annoncé sans engagement.", ["indy-invoicing-2026"]),
  },
  pennylane: {
    availability: {
      sendsInvoices: available("Offre gratuite micro-entreprise et offres Pennylane", ["pennylane-free-2026"]),
      receivesInvoices: available("Offre gratuite micro-entreprise et offres Pennylane", ["pennylane-free-2026"]),
      eReporting: available("Selon le parcours et l'offre Pennylane", ["pennylane-formats-2026"]),
    },
    directImport: documented<DirectImportDetail>({
      acceptsThirdPartyFile: true,
      formats: ["Factur-X"],
      preservesEmbeddedXml: null,
      requiresReentry: null,
    }, ["pennylane-import-facturx-2026", "pennylane-formats-2026"], "L'import Factur-X par API est documenté à partir du plan Essentiel. Le comportement du dépôt web et la conservation à l'identique de l'XML ne sont pas publiés."),
    exitTerms: documented<ExitTerms>({
      bulkExport: null,
      formats: ["Factur-X", "XML"],
      postTerminationAccess: null,
      fees: null,
    }, ["pennylane-formats-2026"], "Le téléchargement du Factur-X et de son XML est documenté. La restitution en masse et l'accès après résiliation ne le sont pas."),
    terminationTerms: documented("L'offre gratuite micro-entreprise est sans engagement. Les conditions des offres payantes restent à lire dans le contrat souscrit.", ["pennylane-free-2026"]),
  },
  qonto: {
    availability: {
      sendsInvoices: available("Qonto Facturation, avec ou sans compte professionnel", ["qonto-invoicing-2026"]),
      receivesInvoices: available("Qonto Facturation, avec ou sans compte professionnel", ["qonto-invoicing-2026", "qonto-flow-2026"]),
      eReporting: documented({ stage: "beta", scope: "Certaines organisations éligibles" }, ["qonto-ereporting-2026"], "L'aide consultée limite encore l'accès à une bêta, malgré la présentation commerciale plus générale."),
    },
    terminationTerms: documented("L'outil de facturation gratuit ne comporte pas d'engagement minimal annoncé.", ["qonto-billing-2026"]),
  },
  sellsy: {
    availability: {
      sendsInvoices: available("Sellsy PA, selon l'offre activée", ["sellsy-invoicing-2026", "sellsy-activation-2026"]),
      receivesInvoices: available("Sellsy PA de réception", ["sellsy-invoicing-2026", "sellsy-reception-2026"]),
      eReporting: available("Selon l'offre Sellsy souscrite", ["sellsy-invoicing-2026", "sellsy-pa-2026"]),
    },
    exitTerms: documented<ExitTerms>({
      bulkExport: null,
      formats: ["CSV", "FEC"],
      postTerminationAccess: null,
      fees: null,
    }, ["sellsy-accountants-2026"], "Des exports comptables sont publiés, sans procédure complète de restitution après résiliation."),
    terminationTerms: documented("L'offre Standard étudiée affiche un engagement de douze mois. Les conditions précises de résiliation restent contractuelles.", ["sellsy-pricing-2026"]),
    hostingProviders: declared(["Scaleway"], ["sellsy-invoicing-2026", "sellsy-accountants-2026"], "Sellsy annonce un hébergement en France chez Scaleway. Cette déclaration ne décrit pas nécessairement tous les sous-traitants de l'offre."),
  },
  septeo: {
    availability: {
      sendsInvoices: available("Plateforme Septeo Ingeneo", ["septeo-pa-2026"]),
      receivesInvoices: available("Plateforme Septeo Ingeneo", ["septeo-pa-2026"]),
      eReporting: available("Plateforme Septeo Ingeneo", ["septeo-pa-2026"]),
    },
    exitTerms: documented<ExitTerms>({
      bulkExport: null,
      formats: [],
      postTerminationAccess: null,
      fees: null,
    }, ["septeo-pa-2026"], "La récupération des données est prévue dans le contrat, mais sa procédure et ses formats ne sont pas publiés."),
  },
  shine: {
    availability: {
      sendsInvoices: available("Shine Facture, avec ou sans compte professionnel", ["shine-pa-2026", "shine-activation-2026"]),
      receivesInvoices: available("Shine Facture, avec ou sans compte professionnel", ["shine-pa-2026", "shine-activation-2026"]),
    },
    terminationTerms: documented("L'offre de facturation étudiée est annoncée sans engagement.", ["shine-pricing-2026"]),
  },
  superpdp: {
    availability: {
      sendsInvoices: available("Compte en ligne et API en production", ["superpdp-features-2026", "superpdp-production-2026"]),
      receivesInvoices: available("Compte en ligne et API en production", ["superpdp-features-2026", "superpdp-production-2026"]),
      eReporting: available("Compte en ligne et API en production", ["superpdp-features-2026", "superpdp-pricing-2026"]),
    },
    overagePricing: documented("Au-delà de 1 000 factures par mois, le compte bascule sur l'offre API : 0,01 € HT par facture jusqu'à 10 000, 0,005 € de 10 000 à 100 000, puis 0,0025 €. KYC/KYB : 2 € HT. Minimum global : 10 € HT par an.", ["superpdp-pricing-2026"]),
  },
  tiime: {
    availability: {
      sendsInvoices: available("Offre Tiime Invoice et PA Tiime", ["tiime-pa-2026", "tiime-pricing-2026"]),
      receivesInvoices: available("Offre Tiime Invoice et PA Tiime", ["tiime-pa-2026", "tiime-pricing-2026"]),
      eReporting: available("Offre Tiime Invoice et PA Tiime", ["tiime-pa-2026"]),
    },
    exitTerms: documented<ExitTerms>({
      bulkExport: null,
      formats: ["FEC"],
      postTerminationAccess: null,
      fees: null,
    }, ["tiime-accountant-2026"], "L'export FEC est documenté. La restitution complète des factures, pièces et statuts après résiliation ne l'est pas."),
    terminationTerms: documented("L'offre de facturation électronique étudiée est annoncée sans engagement.", ["tiime-pricing-2026"]),
    hostingProviders: declared(["Amazon Web Services", "Google Cloud Platform", "At Tiime"], ["tiime-subprocessors-2026"], "La liste Tiime attribue des fonctions d'hébergement ou d'infrastructure à ces entités, avec des localisations distinctes."),
    declaredSubprocessors: declared([
      "Amazon Web Services",
      "Amplitude",
      "At Tiime",
      "Elastic",
      "Front",
      "Google Cloud Platform",
      "Intercom",
      "Jira",
      "Okta",
      "Powens",
      "Slack",
      "Tiime Apps",
      "Tiime Care",
      "Tiime Management Financial Services",
    ], ["tiime-subprocessors-2026"], "Liste déclarée par Tiime. La présence dans cette liste ne signifie pas que chaque sous-traitant intervient dans chaque parcours utilisateur."),
  },
};

function defaultResearch(platformSlug: string): PlatformResearchProfile {
  return {
    platformSlug,
    availability: {
      sendsInvoices: unknown("Le site ne permet pas de distinguer une disponibilité générale d'une fonction limitée, bêta ou seulement annoncée."),
      receivesInvoices: unknown("Le site ne permet pas de distinguer une disponibilité générale d'une fonction limitée, bêta ou seulement annoncée."),
      eReporting: unknown("Le site ne permet pas de distinguer une disponibilité générale d'une fonction limitée, bêta ou seulement annoncée."),
    },
    directImport: unknown("Aucune procédure publique assez précise ne confirme l'import direct d'un Factur-X produit par un autre logiciel."),
    overagePricing: unknown("Le prix exact des dépassements ou le passage au palier suivant n'est pas publié."),
    exitTerms: unknown("L'inventaire des données rendues, leur format, le délai, le coût et l'accès après résiliation ne sont pas publiés ensemble."),
    terminationTerms: unknown("Les règles de résiliation applicables à l'offre étudiée ne sont pas publiées avec assez de précision."),
    hostingProviders: unknown("Aucun hébergeur applicable à la plateforme agréée n'est nommé dans les sources retenues."),
    declaredSubprocessors: unknown("Aucune liste de sous-traitants applicable à la plateforme agréée n'est reliée à la fiche."),
  };
}

export const platformResearchProfiles: PlatformResearchProfile[] = platforms.map((platform) => {
  const base = defaultResearch(platform.slug);
  const override = researchOverrides[platform.slug];
  return {
    ...base,
    ...override,
    availability: { ...base.availability, ...override?.availability },
  };
});

export const platformResearchBySlug = new Map(platformResearchProfiles.map((profile) => [profile.platformSlug, profile]));

export function researchForPlatform(slug: string): PlatformResearchProfile {
  const profile = platformResearchBySlug.get(slug);
  if (!profile) throw new Error(`Recherche de plateforme absente : ${slug}`);
  return profile;
}

export function collectResearchSourceIds(profile: PlatformResearchProfile): string[] {
  const sourceIds = new Set<string>();
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, item] of Object.entries(value)) {
      if (key === "sourceIds" && Array.isArray(item)) {
        for (const sourceId of item) if (typeof sourceId === "string") sourceIds.add(sourceId);
      } else visit(item);
    }
  };
  visit(profile);
  return [...sourceIds];
}
