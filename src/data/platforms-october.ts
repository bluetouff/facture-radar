import { expand } from "./platforms-expanded.ts";
import type { Platform } from "./types.ts";

const checkedAt = "2026-10-14";

export const octoberPlatforms: Platform[] = [
  expand({
  "slug": "befresh",
  "displayName": "BeInvoice by BeFresh",
  "officialName": "BE FRESH S.à r.l.",
  "registeredAt": "En attente",
  "summary": "Service Peppol BeInvoice proposé par BeFresh, avec API REST JSON et hébergement déclaré au Luxembourg. Le périmètre français de la PA reste à préciser.",
  "targets": [],
  "ecosystem": [],
  "importantUnknowns": [
    "Fonctions PA françaises opérationnelles",
    "Tarifs et volumes",
    "Conditions d’accès à l’API",
    "Formats socles français",
    "Certificat ISO applicable et restitution des données",
    "Public visé par l’offre PA et date d’immatriculation"
  ],
  "publicApi": {
    "value": {
      "available": true,
      "includedInFree": null
    },
    "status": "declared",
    "sourceIds": [
      "befresh-pa-20261014"
    ],
    "checkedAt": "2026-10-14",
    "note": "BeFresh annonce une API REST JSON pour intégrer BeInvoice. Documentation d’authentification, accès commercial et échanges PA français à obtenir."
  },
  "integrations": {
    "value": [
      "Peppol",
      "API REST JSON",
      "conversion vers XML Peppol"
    ],
    "status": "declared",
    "sourceIds": [
      "befresh-pa-20261014"
    ],
    "checkedAt": "2026-10-14",
    "note": "Le site décrit les échanges Peppol et la conversion des fichiers existants ; la portée des raccordements français n’est pas détaillée."
  },
  "formats": {
    "value": [
      "UBL Peppol"
    ],
    "status": "declared",
    "sourceIds": [
      "befresh-pa-20261014"
    ],
    "checkedAt": "2026-10-14",
    "note": "La page cite OpenPeppol UBL Invoice comme XML conforme fourni à l’entrée. Formats socles français et conversion des autres formats à préciser."
  },
  "hostingCountries": {
    "value": [
      "Luxembourg"
    ],
    "status": "declared",
    "sourceIds": [
      "befresh-pa-20261014"
    ],
    "checkedAt": "2026-10-14",
    "note": "Hébergement de BeInvoice et datacenters Tier IV déclarés au Luxembourg. Le périmètre contractuel de l’offre PA française reste à confirmer."
  },
  "sendsInvoices": {
    "value": null,
    "status": "non_documented",
    "sourceIds": [],
    "checkedAt": "2026-10-14",
    "note": "La page décrit l’utilisation de Peppol sans détailler le parcours d’émission PA français."
  },
  "receivesInvoices": {
    "value": null,
    "status": "non_documented",
    "sourceIds": [],
    "checkedAt": "2026-10-14",
    "note": "Le parcours de réception français n’est pas décrit assez précisément."
  },
  "eReporting": {
    "value": null,
    "status": "non_documented",
    "sourceIds": [],
    "checkedAt": "2026-10-14",
    "note": "La transmission des données de transactions et paiements au dispositif français n’est pas documentée."
  },
  iso27001: {"value":true,"status":"declared","sourceIds":["befresh-iso-claim-20261022"],"checkedAt":"2026-10-22","note":"Dans une publication du 25 juin 2026, BeFresh déclare une certification ISO/IEC 27001:2022 depuis septembre 2025 pour son SMSI couvrant notamment les logiciels de facturation, le SaaS et le point d’accès Peppol. Certificat courant, dates de validité et périmètre PA français restent à documenter."},
  }),
  expand({
  "slug": "factureapp",
  "displayName": "FacturesApp",
  "officialName": "FACTUREAPP",
  "registeredAt": "En attente",
  "summary": "Solution annonçant la réception illimitée des factures électroniques à 1 € HT par mois, facturé annuellement. Les conditions détaillées des autres plans restent à préciser.",
  "targets": [],
  "ecosystem": [],
  "importantUnknowns": [
    "Plans d’émission et activation",
    "E-reporting opérationnel",
    "Conditions détaillées de l’offre",
    "API, contrat d’hébergement et restitution",
    "Adresse postale divergente entre la DGFiP et le site",
    "Public visé par l’offre PA et date d’immatriculation"
  ],
  "pricing": {
    "value": {
      "kind": "paid",
      "monthlyFrom": 1,
      "unit": "company",
      "freeFor": [],
      "promotionalPriceExcluded": true,
      "label": "Réception illimitée à 1 € HT/mois, facturée 12 € HT/an"
    },
    "status": "documented",
    "sourceIds": [
      "factureapp-pa-20261014"
    ],
    "checkedAt": "2026-10-14",
    "note": "Prix du plan Réception affiché sur l’accueil. Le lien /tarifs répond 404 lors de la revue ; options, conditions et coût de l’émission restent à obtenir."
  },
  "allowance": {
    "value": {
      "monthlyInvoices": null,
      "annualInvoices": null,
      "unlimited": true,
      "label": "Réception illimitée dans le plan Réception"
    },
    "status": "documented",
    "sourceIds": [
      "factureapp-pa-20261014"
    ],
    "checkedAt": "2026-10-14",
    "note": "L’illimité affiché concerne la réception, pas un volume d’émission."
  },
  "receivesInvoices": {
    "value": null,
    "status": "non_documented",
    "sourceIds": [],
    "checkedAt": "2026-10-14",
    "note": "Le site commercial décrit la réception PA disponible et le plan Réception. La disponibilité opérationnelle de cette fonction PA reste à confirmer."
  },
  "sendsInvoices": {
    "value": null,
    "status": "non_documented",
    "sourceIds": [],
    "checkedAt": "2026-10-14",
    "note": "La page mentionne un système d’émission selon le plan choisi, mais les plans et leur activation actuelle ne sont pas détaillés. Ne pas déduire une émission incluse du tarif Réception."
  },
  "accountantAccess": {
    "value": true,
    "status": "declared",
    "sourceIds": [
      "factureapp-pa-20261014"
    ],
    "checkedAt": "2026-10-14",
    "note": "Connexion avec le cabinet comptable annoncée. Droits, périmètre et conditions de partage non détaillés."
  },
  "formats": {
    "value": [
      "Factur-X",
      "UBL 2.1",
      "CII"
    ],
    "status": "declared",
    "sourceIds": [
      "factureapp-pa-20261014"
    ],
    "checkedAt": "2026-10-14",
    "note": "Le site annonce réception et émission de ces formats selon le plan choisi ; détail des conditions à vérifier."
  },
  "eReporting": {
    "value": null,
    "status": "non_documented",
    "sourceIds": [],
    "checkedAt": "2026-10-14",
    "note": "La page évoque les déclarations imposées à la plateforme sans détailler le périmètre de l’e-reporting."
  },
  hostingCountries: {
    value: ["France"],
    status: "declared",
    sourceIds: ["factureapp-privacy-20261101"],
    checkedAt: "2026-11-01",
    note: "La politique v1.0 du 5 janvier 2026 déclare un hébergement exclusif chez OVHcloud en France, avec des sites primaires et secondaires français. Elle décrit séparément l’intervention de CENET SA en Colombie sur l’infrastructure. Service OVHcloud souscrit et qualification SecNumCloud applicable restent à vérifier.",
  },
}),
  expand({
  "slug": "insiders-technologies",
  "displayName": "Insiders Technologies",
  "officialName": "Insiders Technologies GmbH",
  "registeredAt": "En attente",
  "summary": "Solutions e-connect et e-convert pour les échanges et la conversion de factures, avec Peppol, Chorus Pro et SAP. Les conditions de l’offre PA française restent à documenter.",
  "targets": [],
  "ecosystem": [],
  "importantUnknowns": [
    "Fonctions et onboarding PA France",
    "E-reporting",
    "Prix et volumes",
    "API publique",
    "Hébergement de l’offre française et sortie",
    "Public visé par l’offre PA et date d’immatriculation"
  ],
  "integrations": {
    "value": [
      "Peppol",
      "Chorus Pro",
      "SAP S/4HANA",
      "ZRE",
      "SDI"
    ],
    "status": "declared",
    "sourceIds": [
      "insiders-einvoicing-20261014"
    ],
    "checkedAt": "2026-10-14",
    "note": "La page décrit les portails reliés à e-connect et l’add-on e-invoice pilot SAP. Activation et périmètre PA français à confirmer."
  },
  "formats": {
    "value": [
      "Factur-X",
      "Peppol BIS",
      "XRechnung",
      "ZUGFeRD",
      "FatturaPA"
    ],
    "status": "declared",
    "sourceIds": [
      "insiders-einvoicing-20261014"
    ],
    "checkedAt": "2026-10-14",
    "note": "Formats documentés pour e-convert, service de conversion. La matrice de l’offre PA française n’est pas publiée dans cette page."
  },
  "sendsInvoices": {
    "value": null,
    "status": "non_documented",
    "sourceIds": [],
    "checkedAt": "2026-10-14",
    "note": "e-connect décrit des factures entrantes et sortantes, mais l’émission réglementaire PA française et ses conditions ne sont pas documentées dans la page."
  },
  "receivesInvoices": {
    "value": null,
    "status": "non_documented",
    "sourceIds": [],
    "checkedAt": "2026-10-14",
    "note": "La page décrit e-connect pour les échanges de factures ; le parcours de réception PA français reste à rattacher."
  },
  "eReporting": {
    "value": null,
    "status": "non_documented",
    "sourceIds": [],
    "checkedAt": "2026-10-14",
    "note": "L’e-reporting français n’est pas décrit dans la page e-invoicing consultée."
  },
  "hostingCountries": {
    "value": null,
    "status": "non_documented",
    "sourceIds": [],
    "checkedAt": "2026-10-14",
    "note": "Invoice Management porte une déclaration d’hébergement allemand BITMi. Son rattachement précis à l’offre PA française reste à confirmer."
  },
  "publicApi": {
    "value": null,
    "status": "non_documented",
    "sourceIds": [],
    "checkedAt": "2026-10-14",
    "note": "Aucune documentation publique d’accès à l’API de l’offre PA française n’est liée dans la page."
  }
}),
  expand({
  "slug": "kalanda",
  "displayName": "Kalanda",
  "officialName": "KALANDA",
  "registeredAt": "En attente",
  "summary": "Hébergeur français présent dans le fichier des PA agréées. Son site public présente les services cloud et d’infrastructure ; l’offre de facturation électronique reste à préciser.",
  "targets": [],
  "ecosystem": [],
  "importantUnknowns": [
    "Offre PA et fonctions opérationnelles",
    "Tarifs et volumes PA",
    "API",
    "Périmètre des certifications",
    "Hébergement et restitution de la PA",
    "Public visé par l’offre PA et date d’immatriculation"
  ],
  "sendsInvoices": {
    "value": null,
    "status": "non_documented",
    "sourceIds": [],
    "checkedAt": "2026-10-14",
    "note": "L’offre PA d’émission n’est pas décrite sur le site consulté."
  },
  "receivesInvoices": {
    "value": null,
    "status": "non_documented",
    "sourceIds": [],
    "checkedAt": "2026-10-14",
    "note": "L’offre PA de réception n’est pas décrite sur le site consulté."
  },
  "eReporting": {
    "value": null,
    "status": "non_documented",
    "sourceIds": [],
    "checkedAt": "2026-10-14",
    "note": "Le périmètre de l’e-reporting PA reste à documenter."
  },
  "pricing": {
    "value": null,
    "status": "non_documented",
    "sourceIds": [],
    "checkedAt": "2026-10-14",
    "note": "Les prix affichés concernent Nextcloud, hébergement, serveurs et messagerie, pas une offre PA."
  },
  "hostingCountries": {
    "value": null,
    "status": "non_documented",
    "sourceIds": [],
    "checkedAt": "2026-10-14",
    "note": "Le site présente une infrastructure française ; son rattachement contractuel à la plateforme de facturation reste à confirmer."
  },
  "iso27001": {
    "value": null,
    "status": "non_documented",
    "sourceIds": [],
    "checkedAt": "2026-10-14",
    "note": "Kalanda annonce des infrastructures ISO 27001/HDS depuis 2019. Le certificat applicable à la PA et son périmètre restent à rattacher."
  }
}),
  expand({
  "slug": "my-eddy",
  "displayName": "MY-EDDY",
  "officialName": "MY-EDDY",
  "registeredAt": "En attente",
  "summary": "Acteur associé par la DGFiP au site DailyApps, consacré à la gestion RH et aux notes de frais des TPE-PME. Les fonctions de son offre PA restent à préciser.",
  "targets": [],
  "ecosystem": [],
  "importantUnknowns": [
    "Nom commercial et offre PA",
    "Fonctions PA opérationnelles",
    "Prix et volumes PA",
    "API et intégrations de la PA",
    "Hébergement et restitution",
    "Public visé par l’offre PA et date d’immatriculation"
  ],
  "sendsInvoices": {
    "value": null,
    "status": "non_documented",
    "sourceIds": [],
    "checkedAt": "2026-10-14",
    "note": "DailyApps présente des outils RH et de notes de frais ; une offre d’émission PA n’y est pas décrite."
  },
  "receivesInvoices": {
    "value": null,
    "status": "non_documented",
    "sourceIds": [],
    "checkedAt": "2026-10-14",
    "note": "La réception PA française n’est pas décrite sur l’accueil fourni par la DGFiP."
  },
  "eReporting": {
    "value": null,
    "status": "non_documented",
    "sourceIds": [],
    "checkedAt": "2026-10-14",
    "note": "Le service d’e-reporting n’est pas documenté dans la page consultée."
  },
  "pricing": {
    "value": null,
    "status": "non_documented",
    "sourceIds": [],
    "checkedAt": "2026-10-14",
    "note": "Les tarifs DailyApps portent sur des packs d’applications RH par utilisateur ; prix de la PA non documenté."
  },
  "integrations": {
    "value": null,
    "status": "non_documented",
    "sourceIds": [],
    "checkedAt": "2026-10-14",
    "note": "La FAQ présente des exports Excel RH et notes de frais vers plusieurs logiciels, avec absence de connecteur direct. Le rattachement de ces échanges à la PA n’est pas établi."
  }
}),
  expand({
  "slug": "ratioo",
  "displayName": "Ratioo",
  "officialName": "RATIOO",
  "registeredAt": "En attente",
  "summary": "Suite de gestion pour experts-comptables et clients, avec page PA décrivant émission, réception et e-reporting. Prix public par dossier conditionné au volume du cabinet.",
  "targets": [],
  "ecosystem": [],
  "importantUnknowns": [
    "Conditions tarifaires selon volume et TVA",
    "Activation et périmètre e-reporting",
    "Autres formats socles",
    "API publique",
    "Certificat ISO et restitution complète",
    "Public visé par l’offre PA et date d’immatriculation"
  ],
  "sendsInvoices": {
    "value": null,
    "status": "non_documented",
    "sourceIds": [],
    "checkedAt": "2026-10-14",
    "note": "La page PA décrit l’envoi automatisé aux plateformes partenaires et le format Factur-X. La disponibilité opérationnelle de cette fonction PA reste à confirmer."
  },
  "receivesInvoices": {
    "value": null,
    "status": "non_documented",
    "sourceIds": [],
    "checkedAt": "2026-10-14",
    "note": "La page PA décrit la réception et la centralisation des flux des clients du cabinet. La disponibilité opérationnelle de cette fonction PA reste à confirmer."
  },
  "eReporting": {
    "value": null,
    "status": "non_documented",
    "sourceIds": [],
    "checkedAt": "2026-10-14",
    "note": "Transmission automatique des données de transactions et paiements annoncée ; périmètre et activation à vérifier lors de l’onboarding. La disponibilité opérationnelle de cette fonction PA reste à confirmer."
  },
  "accountantAccess": {
    "value": true,
    "status": "declared",
    "sourceIds": [
      "ratioo-pa-offre-20261014"
    ],
    "checkedAt": "2026-10-14",
    "note": "Interface dédiée aux cabinets, tableau de bord du portefeuille client et suivi de mise en conformité."
  },
  "formats": {
    "value": [
      "Factur-X"
    ],
    "status": "declared",
    "sourceIds": [
      "ratioo-pa-offre-20261014"
    ],
    "checkedAt": "2026-10-14",
    "note": "Factur-X explicitement cité sur la page PA ; UBL et CII non ajoutés faute de preuve."
  },
  "pricing": {
    "value": {
      "kind": "quote",
      "monthlyFrom": null,
      "unit": "quote",
      "freeFor": [],
      "promotionalPriceExcluded": true,
      "label": "Dès 4 €/dossier/mois, tarif calculé sur 200 dossiers ; devis selon volume"
    },
    "status": "documented",
    "sourceIds": [
      "ratioo-pricing-20261014"
    ],
    "checkedAt": "2026-10-14",
    "note": "La page tarifaire indique un coût par dossier, calculé sur la base de 200 dossiers, et inclut le module PA. TVA, minimum facturé, contrats et accès PA autonome restent à préciser. Éviter une simulation de 4 € par entreprise indépendamment du portefeuille."
  },
  "hostingCountries": {
    "value": [
      "France"
    ],
    "status": "declared",
    "sourceIds": [
      "ratioo-pa-20261014"
    ],
    "checkedAt": "2026-10-14",
    "note": "Développement et hébergement annoncés dans les Hauts-de-France ; sous-traitants et périmètre contractuel à vérifier."
  },
  "iso27001": {
    "value": true,
    "status": "declared",
    "sourceIds": [
      "ratioo-pa-offre-20261014"
    ],
    "checkedAt": "2026-10-14",
    "note": "La page PA revendique une infrastructure ISO 27001. Certificat public, dates et périmètre non archivés ; conserver une déclaration."
  },
  "publicApi": {
    "value": null,
    "status": "non_documented",
    "sourceIds": [],
    "checkedAt": "2026-10-14",
    "note": "La documentation publique et les conditions d’accès à l’API n’ont pas été identifiées dans les pages retenues."
  }
}),
].map(platform => {
  for (const value of Object.values(platform)) {
    if (value && typeof value === "object" && "checkedAt" in value && value.checkedAt < checkedAt) value.checkedAt = checkedAt;
  }
  platform.officialStatus.sourceIds = ["dgfip-list-20261014"];
  platform.registeredAt.sourceIds = ["dgfip-list-20261014"];
  platform.registeredAt.note = "La liste DGFiP mise à jour le 13 octobre classe cet acteur parmi les PA agréées et affiche En attente dans la colonne date d’immatriculation. La date précise reste non publiée.";
  return platform;
});
