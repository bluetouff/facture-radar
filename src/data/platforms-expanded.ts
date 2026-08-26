import type { Evidence, Platform, Pricing, Allowance } from "./types.ts";

const checkedAt = "2026-08-26";

const official = <T>(value: T, note?: string): Evidence<T> => ({
  value,
  status: "official",
  sourceIds: ["dgfip-list-2026-08-19"],
  checkedAt,
  note,
});

const documented = <T>(value: T, sourceIds: string[], note?: string): Evidence<T> => ({
  value,
  status: "documented",
  sourceIds,
  checkedAt,
  note,
});

const declared = <T>(value: T, sourceIds: string[], note?: string): Evidence<T> => ({
  value,
  status: "declared",
  sourceIds,
  checkedAt,
  note,
});

const unknown = <T>(note: string): Evidence<T> => ({
  value: null,
  status: "non_documented",
  sourceIds: [],
  checkedAt,
  note,
});

type ExpansionDefinition = Pick<Platform,
  "slug" | "displayName" | "officialName" | "summary" | "targets" | "ecosystem" | "importantUnknowns"
> & {
  registeredAt: string;
  pricing?: Evidence<Pricing>;
  allowance?: Evidence<Allowance>;
  sendsInvoices?: Evidence<boolean>;
  receivesInvoices?: Evidence<boolean>;
  eReporting?: Evidence<boolean>;
  bankAccountRequired?: Evidence<boolean>;
  accountantAccess?: Evidence<boolean>;
  publicApi?: Evidence<{ available: boolean; includedInFree: boolean | null }>;
  exportDocumented?: Evidence<boolean>;
  integrations?: Evidence<string[]>;
  formats?: Evidence<string[]>;
  hostingCountries?: Evidence<string[]>;
  iso27001?: Evidence<boolean>;
  commitmentMonths?: Evidence<number>;
};

function expand(definition: ExpansionDefinition): Platform {
  return {
    slug: definition.slug,
    displayName: definition.displayName,
    officialName: definition.officialName,
    summary: definition.summary,
    targets: definition.targets,
    ecosystem: definition.ecosystem,
    officialStatus: official("registered"),
    registeredAt: official(definition.registeredAt),
    pricing: definition.pricing ?? unknown("Aucune grille tarifaire publique exploitable n'a été identifiée."),
    allowance: definition.allowance ?? unknown("Les volumes inclus et les coûts de dépassement ne sont pas publiés."),
    sendsInvoices: definition.sendsInvoices ?? unknown("L'émission n'est pas décrite assez précisément dans les pages publiques retenues."),
    receivesInvoices: definition.receivesInvoices ?? unknown("La réception n'est pas décrite assez précisément dans les pages publiques retenues."),
    eReporting: definition.eReporting ?? unknown("L'activation opérationnelle de l'e-reporting n'est pas documentée dans les pages retenues."),
    bankAccountRequired: definition.bankAccountRequired ?? unknown("Aucun prérequis bancaire explicite n'est publié."),
    accountantAccess: definition.accountantAccess ?? unknown("L'accès destiné à un comptable externe n'est pas détaillé."),
    publicApi: definition.publicApi ?? unknown("Les conditions d'accès à une API publique ne sont pas publiées."),
    exportDocumented: definition.exportDocumented ?? unknown("La restitution complète des données après résiliation n'est pas documentée."),
    integrations: definition.integrations ?? unknown("La liste des intégrations et leurs conditions ne sont pas publiées avec assez de précision."),
    formats: definition.formats ?? unknown("La matrice des formats réellement disponibles n'est pas publiée avec assez de précision."),
    hostingCountries: definition.hostingCountries ?? unknown("Le lieu d'hébergement et les sous-traitants applicables à la PA ne sont pas publiés."),
    iso27001: definition.iso27001 ?? unknown("Aucun certificat ISO 27001 applicable à la PA n'a été rattaché à la fiche."),
    commitmentMonths: definition.commitmentMonths ?? unknown("La durée d'engagement dépend du contrat ou du devis."),
    importantUnknowns: definition.importantUnknowns,
  };
}

const quote = (label = "Tarification publique non identifiée, devis nécessaire"): Evidence<Pricing> => unknown(label);

export const expandedPlatforms: Platform[] = [
  expand({
    slug: "b2brouter", displayName: "B2BRouter", officialName: "B2BRouter", registeredAt: "2025-12-12",
    summary: "Application web et API de facturation électronique, avec une offre gratuite limitée à 24 transactions par an.",
    targets: ["micro", "tpe", "pme"], ecosystem: ["API", "Peppol", "Chorus Pro", "SFTP", "facturation"],
    pricing: documented({ kind: "free", monthlyFrom: 0, unit: "company", freeFor: ["micro", "tpe"], promotionalPriceExcluded: true, label: "Basic gratuit, Professional 110 € HT par an, Business 300 € HT par an" }, ["b2brouter-pricing-2026"]),
    allowance: documented({ monthlyInvoices: null, annualInvoices: 24, unlimited: false, label: "24 transactions par an dans Basic, émission et réception illimitées en Professional" }, ["b2brouter-pricing-2026"]),
    sendsInvoices: documented(true, ["b2brouter-pricing-2026"]), receivesInvoices: documented(true, ["b2brouter-pricing-2026"]), eReporting: documented(true, ["b2brouter-pricing-2026", "b2brouter-france-api-2026"]),
    bankAccountRequired: documented(false, ["b2brouter-pricing-2026"]), accountantAccess: unknown("L'accès gratuit ou dédié à un comptable externe reste à confirmer."),
    publicApi: documented({ available: true, includedInFree: false }, ["b2brouter-api-2026", "b2brouter-france-api-2026"]),
    integrations: documented(["API", "SDK", "SFTP", "Peppol", "Chorus Pro"], ["b2brouter-api-2026", "b2brouter-france-api-2026"]),
    formats: documented(["Factur-X", "UBL", "CII"], ["b2brouter-pricing-2026", "b2brouter-france-api-2026"]), commitmentMonths: documented(0, ["b2brouter-pricing-2026"]),
    importantUnknowns: ["Conservation du XML EN16931 d'un Factur-X importé", "Accès comptable", "Hébergement", "Restitution complète après résiliation"],
  }),
  expand({
    slug: "dext", displayName: "Dext", officialName: "DEXT", registeredAt: "2025-12-11",
    summary: "Plateforme pensée pour les entreprises et les cabinets, avec une offre gratuite de facturation électronique.",
    targets: ["micro", "tpe", "pme"], ecosystem: ["cabinet comptable", "OCR", "GED", "collecte", "facturation"],
    pricing: documented({ kind: "free", monthlyFrom: 0, unit: "company", freeFor: ["micro", "tpe", "pme"], promotionalPriceExcluded: true, label: "Compte gratuit pour facturation électronique et e-reporting, offre complète à 25 € HT par mois avec engagement annuel" }, ["dext-pricing-2026"]),
    allowance: documented({ monthlyInvoices: null, annualInvoices: null, unlimited: true, label: "Création de devis et factures annoncée sans limite dans le compte gratuit" }, ["dext-pricing-2026"]),
    sendsInvoices: documented(true, ["dext-pa-2026", "dext-send-electronic-2026"]), receivesInvoices: documented(true, ["dext-pa-2026"]), eReporting: documented(true, ["dext-pa-2026"]),
    bankAccountRequired: documented(false, ["dext-pricing-2026"]), accountantAccess: documented(true, ["dext-pa-2026"], "Un mandat signé est demandé lorsque le cabinet agit pour son client."),
    formats: documented(["Factur-X", "UBL", "CII"], ["dext-pa-2026"]), commitmentMonths: documented(0, ["dext-pricing-2026"], "Le compte gratuit n'impose pas d'engagement."),
    importantUnknowns: ["API publique", "Hébergement", "Export complet", "Limites du stockage gratuit"],
  }),
  expand({
    slug: "dougs", displayName: "Dougs", officialName: "Dougs Facturation gratuite", registeredAt: "2025-12-12",
    summary: "Outil de facturation et plateforme agréée gratuits, destiné aux entrepreneurs et indépendants.",
    targets: ["micro", "tpe"], ecosystem: ["facturation", "comptabilité", "application mobile", "trésorerie"],
    pricing: documented({ kind: "free", monthlyFrom: 0, unit: "company", freeFor: ["micro", "tpe"], promotionalPriceExcluded: true, label: "Pack de facturation électronique à 0 € HT par mois, sans obligation d'achat" }, ["dougs-free-2026"]),
    allowance: documented({ monthlyInvoices: null, annualInvoices: null, unlimited: true, label: "Factures annoncées sans limite de volume" }, ["dougs-free-2026"]),
    sendsInvoices: documented(true, ["dougs-free-2026"]), receivesInvoices: documented(true, ["dougs-free-2026"]), eReporting: documented(true, ["dougs-free-2026"]), bankAccountRequired: documented(false, ["dougs-free-2026"]), accountantAccess: declared(true, ["dougs-free-2026"], "Le rapprochement avec la comptabilité et l'expert-comptable est présenté par l'éditeur."), formats: documented(["Factur-X"], ["dougs-free-2026"]), commitmentMonths: documented(0, ["dougs-free-2026"]),
    importantUnknowns: ["API publique", "Exports", "Hébergement", "Prise en charge publique d'UBL et CII"],
  }),
  expand({
    slug: "billit", displayName: "Billit", officialName: "BILLIT", registeredAt: "2025-12-19",
    summary: "Solution de facturation reliée à Peppol, avec envoi gratuit et offre complète facturée selon les volumes.",
    targets: ["micro", "tpe", "pme"], ecosystem: ["Peppol", "API", "facturation", "intégrations comptables"],
    pricing: documented({ kind: "free", monthlyFrom: 0, unit: "company", freeFor: ["micro", "tpe"], promotionalPriceExcluded: true, label: "Envoi des factures de vente gratuit, offre complète à partir de 7,50 € HT par mois" }, ["billit-pricing-2026"]),
    allowance: unknown("Le nombre de documents inclus dépend du volume choisi et n'est pas lisible sous forme de grille fixe."),
    sendsInvoices: documented(true, ["billit-pricing-2026", "billit-france-api-2026"]), receivesInvoices: documented(true, ["billit-pricing-2026"], "La réception relève de l'offre complète, pas du plan gratuit limité aux ventes."),
    bankAccountRequired: documented(false, ["billit-pricing-2026"]), publicApi: documented({ available: true, includedInFree: null }, ["billit-france-api-2026"]), integrations: documented(["API", "Peppol", "intégrations comptables"], ["billit-pricing-2026", "billit-france-api-2026"]), commitmentMonths: documented(3, ["billit-pricing-2026"], "L'offre payante est souscrite au trimestre ou à l'année."),
    importantUnknowns: ["E-reporting opérationnel", "Formats français exacts", "Volumes inclus", "Conditions de sortie"],
  }),
  expand({
    slug: "ipaidthat", displayName: "iPaidThat", officialName: "iPaidThat", registeredAt: "2026-01-06",
    summary: "Pré-comptabilité, trésorerie et plateforme agréée avec prix et volumes publics.",
    targets: ["micro", "tpe", "pme"], ecosystem: ["pré-comptabilité", "trésorerie", "cabinet comptable", "API", "paiement"],
    pricing: documented({ kind: "paid", monthlyFrom: 59, unit: "subscription", freeFor: [], promotionalPriceExcluded: true, label: "Essentiel 59 €, Pro 99 € et Pro+ 209 € HT par mois" }, ["ipaidthat-pricing-2026"]),
    allowance: documented({ monthlyInvoices: 100, annualInvoices: null, unlimited: false, label: "100 factures par mois en Essentiel, 200 en Pro, 400 en Pro+" }, ["ipaidthat-pricing-2026"]),
    sendsInvoices: documented(true, ["ipaidthat-pa-2026", "ipaidthat-pricing-2026"]), receivesInvoices: documented(true, ["ipaidthat-pa-2026", "ipaidthat-pricing-2026"]), eReporting: documented(true, ["ipaidthat-pa-2026", "ipaidthat-pricing-2026"]),
    bankAccountRequired: documented(false, ["ipaidthat-pricing-2026"]), accountantAccess: documented(true, ["ipaidthat-accountants-2026"]), publicApi: documented({ available: true, includedInFree: false }, ["ipaidthat-pricing-2026"]), integrations: documented(["ACD", "MyUnisoft", "Inqom", "Sage", "Cegid", "EBP", "Pennylane", "API"], ["ipaidthat-accountants-2026", "ipaidthat-pricing-2026"]), commitmentMonths: documented(0, ["ipaidthat-pa-2026"]),
    importantUnknowns: ["Formats exacts", "Hébergement", "Coût des volumes supplémentaires", "Restitution après résiliation"],
  }),
  expand({
    slug: "agicap", displayName: "Agicap", officialName: "AGICAP", registeredAt: "2026-01-20",
    summary: "Plateforme agréée intégrée au pilotage de trésorerie, aux achats et au recouvrement.",
    targets: ["pme", "eti", "ge"], ecosystem: ["trésorerie", "achats", "recouvrement", "API", "SFTP"],
    pricing: quote("Tarification sur devis avec engagement annuel"), sendsInvoices: documented(true, ["agicap-pa-2026", "agicap-api-2026"]), receivesInvoices: documented(true, ["agicap-pa-2026", "agicap-api-2026"]), eReporting: documented(true, ["agicap-pa-2026", "agicap-api-2026"]),
    publicApi: documented({ available: true, includedInFree: null }, ["agicap-api-2026"], "L'API française est publique en bac à sable. La production est réservée au pilote selon la documentation consultée."), integrations: documented(["API", "SFTP", "plus de 150 intégrations comptables et financières"], ["agicap-pa-2026", "agicap-api-2026"]), formats: documented(["Factur-X", "UBL", "CII", "JSON pivot"], ["agicap-pa-2026", "agicap-api-2026"]), commitmentMonths: documented(12, ["agicap-pricing-2026"]),
    importantUnknowns: ["Ouverture générale de l'API de production France", "Prix et volumes", "Hébergement", "Conditions de sortie"],
  }),
  expand({
    slug: "spendesk", displayName: "Spendesk", officialName: "SPENDESK", registeredAt: "2026-01-15",
    summary: "Gestion des dépenses et réception de factures fournisseurs rapprochées aux paiements.",
    targets: ["pme", "eti", "ge"], ecosystem: ["dépenses", "cartes", "notes de frais", "ERP", "achats"],
    pricing: quote(), receivesInvoices: documented(true, ["spendesk-pa-2026"]), accountantAccess: declared(true, ["spendesk-pa-2026"], "L'historique et les exports sont conçus pour les équipes finance et leur production comptable."), integrations: documented(["Xero", "NetSuite", "Sage", "DATEV", "ERP"], ["spendesk-pa-2026"]),
    importantUnknowns: ["Émission de factures clients", "E-reporting", "Formats pris en charge", "Prix et engagement"],
  }),
  expand({
    slug: "lucca", displayName: "Lucca Factures", officialName: "LUCCA", registeredAt: "2026-04-24",
    summary: "Réception et traitement des factures fournisseurs intégrés à la suite financière Lucca.",
    targets: ["pme", "eti"], ecosystem: ["factures fournisseurs", "notes de frais", "paiement", "API", "SIRH"],
    pricing: documented({ kind: "paid", monthlyFrom: 0.91, unit: "subscription", freeFor: [], promotionalPriceExcluded: true, label: "Exemple public à 0,91 € HT par facture pour 600 à 799 factures, PA incluse sans surcoût" }, ["lucca-pricing-2026", "lucca-activation-2026"]),
    allowance: unknown("Le tarif est dégressif et dépend de la consommation réelle."), receivesInvoices: documented(true, ["lucca-invoices-2026"]), eReporting: documented(true, ["lucca-invoices-2026"]), bankAccountRequired: documented(false, ["lucca-invoices-2026"]), accountantAccess: unknown("Le partage avec un comptable externe n'est pas détaillé dans les pages retenues."), integrations: documented(["API", "plus de 15 logiciels comptables", "exports personnalisables"], ["lucca-invoices-2026"]), commitmentMonths: documented(0, ["lucca-pricing-2026"]),
    importantUnknowns: ["Émission de factures clients", "Formats pris en charge", "API publique et coût", "Hébergement de la PA"],
  }),
  expand({
    slug: "n2f", displayName: "N2F", officialName: "N2F PDP", registeredAt: "2025-12-19",
    summary: "Plateforme orientée factures fournisseurs et notes de frais, avec émission, réception et archivage.",
    targets: ["tpe", "pme", "eti", "ge"], ecosystem: ["factures fournisseurs", "notes de frais", "TVA", "archivage", "API"],
    pricing: quote(), sendsInvoices: documented(true, ["n2f-pa-2026"]), receivesInvoices: documented(true, ["n2f-pa-2026"]), eReporting: documented(true, ["n2f-pa-2026"]), formats: documented(["Factur-X", "UBL", "CII"], ["n2f-pa-2026"]), iso27001: declared(true, ["n2f-pa-2026"], "Certification annoncée par N2F, certificat et périmètre à archiver."),
    publicApi: declared({ available: true, includedInFree: null }, ["n2f-pa-2026"], "L'émission client par API suppose des données déjà structurées et conformes."),
    importantUnknowns: ["Prix et volumes", "Accès à l'API", "Hébergement", "Restitution complète"],
  }),
  expand({
    slug: "flowie", displayName: "Flowie", officialName: "FLOWIE", registeredAt: "2026-01-07",
    summary: "Gestion achats et ventes avec connecteurs ERP, API et couverture internationale.",
    targets: ["pme", "eti", "ge"], ecosystem: ["achats", "ventes", "recouvrement", "API", "EDI", "Peppol"],
    pricing: documented({ kind: "quote", monthlyFrom: null, unit: "quote", freeFor: [], promotionalPriceExcluded: true, label: "Tarification au nombre de documents, montant public non identifié" }, ["flowie-smb-2026"]), sendsInvoices: documented(true, ["flowie-france-2026", "flowie-sales-2026"]), receivesInvoices: documented(true, ["flowie-france-2026", "flowie-smb-2026"]), eReporting: documented(true, ["flowie-france-2026"]), publicApi: documented({ available: true, includedInFree: null }, ["flowie-france-2026"]), integrations: documented(["API REST", "EDI", "SFTP", "Peppol", "plus de 30 connecteurs ERP"], ["flowie-france-2026", "flowie-sales-2026"]), formats: documented(["Factur-X", "UBL", "CII", "Peppol BIS", "EDI"], ["flowie-france-2026", "flowie-sales-2026"]), hostingCountries: declared(["Union européenne"], ["flowie-france-2026"]), iso27001: declared(true, ["flowie-france-2026"]),
    importantUnknowns: ["Prix et volumes", "Ancienne page mentionnant encore une candidature", "Engagement", "Conditions de sortie"],
  }),
  expand({
    slug: "axelor", displayName: "Axelor", officialName: "AXELOR", registeredAt: "2026-04-13",
    summary: "Plateforme agréée intégrée à un ERP open source pour les cycles achats et ventes.",
    targets: ["pme", "eti", "ge"], ecosystem: ["ERP", "open source", "achats", "ventes", "archivage"],
    pricing: quote(), sendsInvoices: documented(true, ["axelor-pa-2026"]), receivesInvoices: documented(true, ["axelor-pa-2026"]), eReporting: documented(true, ["axelor-pa-2026"]), formats: documented(["Factur-X", "UBL", "CII"], ["axelor-pa-2026"]), integrations: documented(["Axelor ERP", "connecteurs ERP"], ["axelor-pa-2026"]),
    importantUnknowns: ["Prix et volumes", "API de la PA", "Hébergement", "Conditions de sortie"],
  }),
  expand({
    slug: "a-cube", displayName: "A-Cube", officialName: "A-Cube", registeredAt: "2026-07-21",
    summary: "API de conformité française pour éditeurs et équipes techniques, avec bac à sable public.",
    targets: ["pme", "eti", "ge"], ecosystem: ["API", "webhooks", "KYC", "annuaire", "Peppol"],
    pricing: quote("Bac à sable gratuit, tarification de production non publiée"), sendsInvoices: documented(true, ["acube-france-api-2026", "acube-formats-2026"], "Le Factur-X sortant est annoncé prochainement, UBL et CII sont disponibles."), receivesInvoices: documented(true, ["acube-france-api-2026", "acube-formats-2026"]), eReporting: documented(true, ["acube-france-api-2026"]), publicApi: documented({ available: true, includedInFree: true }, ["acube-france-api-2026"], "Le bac à sable est disponible sans paiement."), integrations: documented(["API", "webhooks", "Peppol", "EDI"], ["acube-france-api-2026", "acube-formats-2026"]), formats: documented(["UBL", "CII", "Factur-X en réception"], ["acube-formats-2026"]),
    importantUnknowns: ["Date du Factur-X sortant", "Prix de production", "Hébergement", "SLA et réversibilité"],
  }),
  expand({
    slug: "invopop", displayName: "Invopop", officialName: "INVOPOP", registeredAt: "2026-01-15",
    summary: "API internationale de conformité et facturation, avec tarification publique à la consommation.",
    targets: ["pme", "eti", "ge"], ecosystem: ["API", "Peppol", "NetSuite", "Stripe", "Chargebee"],
    pricing: documented({ kind: "free", monthlyFrom: 0, unit: "subscription", freeFor: ["tpe", "pme"], promotionalPriceExcluded: true, label: "Dev gratuit jusqu'à 200 Pops, Pro à partir de 500 € par mois plus consommation" }, ["invopop-pricing-2026"]), allowance: documented({ monthlyInvoices: null, annualInvoices: null, unlimited: false, label: "200 Pops par mois gratuits, une facture ou un statut France consomme plusieurs Pops" }, ["invopop-pricing-2026", "invopop-france-2026"]), sendsInvoices: documented(true, ["invopop-france-2026"]), receivesInvoices: documented(true, ["invopop-france-2026"]), eReporting: unknown("L'e-reporting France est encore indiqué en développement actif dans la documentation consultée."), publicApi: documented({ available: true, includedInFree: true }, ["invopop-pricing-2026", "invopop-france-2026"]), integrations: documented(["API", "NetSuite", "Stripe", "Chargebee", "webhooks"], ["invopop-pricing-2026"]), formats: documented(["Factur-X", "UBL", "CII"], ["invopop-france-2026"]), iso27001: declared(true, ["invopop-pricing-2026"], "La certification est annoncée dans l'offre Pro."),
    importantUnknowns: ["Disponibilité de l'e-reporting", "Coût réel selon les Pops", "Hébergement", "Réversibilité"],
  }),
  expand({
    slug: "storecove", displayName: "Storecove", officialName: "STORECOVE", registeredAt: "2026-04-28",
    summary: "API mondiale de facturation électronique pour connecter un logiciel à plusieurs cadres nationaux.",
    targets: ["pme", "eti", "ge"], ecosystem: ["API", "Peppol", "DBNA", "éditeurs", "ERP"],
    pricing: quote("Test de 30 jours, prix de production sur devis"), sendsInvoices: documented(true, ["storecove-france-2026", "storecove-api-2026"]), receivesInvoices: documented(true, ["storecove-france-2026", "storecove-api-2026"]), eReporting: documented(true, ["storecove-france-2026"]), publicApi: documented({ available: true, includedInFree: null }, ["storecove-api-2026"]), integrations: documented(["API REST", "Peppol", "DBNA", "plus de 30 cadres nationaux"], ["storecove-france-2026", "storecove-api-2026"]), formats: documented(["Factur-X", "UBL", "CII"], ["storecove-france-2026"]), iso27001: declared(true, ["storecove-api-2026"]),
    importantUnknowns: ["Prix et volumes", "Engagement", "Hébergement de la PA France", "Restitution complète"],
  }),
  expand({
    slug: "pagero", displayName: "ONESOURCE Pagero", officialName: "PAGERO", registeredAt: "2025-12-19",
    summary: "Réseau mondial de conformité désormais proposé par Thomson Reuters pour connecter les ERP.",
    targets: ["eti", "ge"], ecosystem: ["Thomson Reuters", "ERP", "achats", "ventes", "réseau mondial"],
    pricing: quote(), sendsInvoices: documented(true, ["pagero-france-2026"]), receivesInvoices: documented(true, ["pagero-france-2026"]), eReporting: documented(true, ["pagero-france-2026"]), integrations: documented(["ERP", "outils achats", "outils fiscaux", "intégrations personnalisées"], ["pagero-connectivity-2026"]), formats: documented(["UBL 2.1", "CII", "Factur-X", "Peppol BIS", "EDIFACT"], ["pagero-france-2026"]),
    importantUnknowns: ["Prix et volumes", "Engagement", "Hébergement France", "API publique"],
  }),
  expand({
    slug: "basware", displayName: "Basware", officialName: "BASWARE", registeredAt: "2025-12-18",
    summary: "Réseau de facturation et automatisation fournisseurs pour groupes internationaux.",
    targets: ["eti", "ge"], ecosystem: ["achats", "ERP", "réseau mondial", "comptes fournisseurs"],
    pricing: quote(), sendsInvoices: documented(true, ["basware-france-2026"]), receivesInvoices: documented(true, ["basware-france-2026"]), eReporting: documented(true, ["basware-mandate-2026"]), formats: documented(["Factur-X", "UBL 2.1", "CII"], ["basware-mandate-2026"]), integrations: documented(["ERP", "réseau Basware"], ["basware-france-2026"]),
    importantUnknowns: ["Prix et volumes", "API publique", "Hébergement France", "Conditions de sortie"],
  }),
  expand({
    slug: "avalara", displayName: "Avalara", officialName: "AVALARA", registeredAt: "2025-12-18",
    summary: "API de conformité fiscale internationale avec documentation technique détaillée des flux français.",
    targets: ["eti", "ge"], ecosystem: ["API", "fiscalité", "ERP", "e-reporting", "international"],
    pricing: quote(), sendsInvoices: documented(true, ["avalara-france-api-2026"]), receivesInvoices: documented(true, ["avalara-france-formats-2026"]), eReporting: documented(true, ["avalara-france-api-2026"]), publicApi: documented({ available: true, includedInFree: null }, ["avalara-france-api-2026", "avalara-france-formats-2026"]), integrations: documented(["API E-Invoicing and Live Reporting", "ERP"], ["avalara-france-api-2026"]), formats: documented(["UBL 2.1", "CII D22B", "Factur-X 1.08", "formats étendus"], ["avalara-france-api-2026", "avalara-france-formats-2026"]),
    importantUnknowns: ["Prix et volumes", "Engagement", "Hébergement France", "Restitution complète"],
  }),
  expand({
    slug: "comarch", displayName: "Comarch", officialName: "COMARCH SA", registeredAt: "2025-12-18",
    summary: "Échanges de données et conformité internationale intégrés aux ERP des grands groupes.",
    targets: ["eti", "ge"], ecosystem: ["EDI", "ERP", "SAP", "Oracle", "international"],
    pricing: quote(), sendsInvoices: documented(true, ["comarch-france-2026"]), receivesInvoices: documented(true, ["comarch-france-2026"]), eReporting: documented(true, ["comarch-france-2026", "comarch-registration-2026"]), integrations: documented(["SAP", "Oracle", "ERP", "EDI"], ["comarch-france-2026"]), formats: documented(["Factur-X", "UBL", "CII"], ["comarch-registration-2026"]), iso27001: declared(true, ["comarch-registration-2026"]),
    importantUnknowns: ["Prix et volumes", "API publique", "Hébergement France", "Réversibilité"],
  }),
  expand({
    slug: "edicom", displayName: "EDICOM", officialName: "EDICOM France", registeredAt: "2025-12-11",
    summary: "Plateforme mondiale EDI, facturation électronique et conformité fiscale pour groupes internationaux.",
    targets: ["eti", "ge"], ecosystem: ["EDI", "ERP", "B2B", "B2G", "international"],
    pricing: quote(), sendsInvoices: documented(true, ["edicom-france-2026", "edicom-platform-2026"]), receivesInvoices: documented(true, ["edicom-france-2026", "edicom-platform-2026"]), eReporting: documented(true, ["edicom-france-2026"]), integrations: documented(["ERP", "EDI B2B/B2G", "autorités fiscales"], ["edicom-platform-2026"]), formats: documented(["UBL", "CII", "Factur-X", "EDI"], ["edicom-france-2026"]),
    importantUnknowns: ["Prix et volumes", "API publique", "Hébergement France", "Engagement"],
  }),
  expand({
    slug: "opentext", displayName: "OpenText", officialName: "OPENTEXT", registeredAt: "2025-12-12",
    summary: "Réseau B2B mondial pour connecter les comptes clients et fournisseurs aux ERP.",
    targets: ["eti", "ge"], ecosystem: ["Trading Grid", "ERP", "B2B", "achats", "ventes"],
    pricing: quote(), sendsInvoices: documented(true, ["opentext-france-2026"]), receivesInvoices: documented(true, ["opentext-france-2026"]), eReporting: documented(true, ["opentext-france-2026"]), integrations: documented(["OpenText Trading Grid", "ERP", "comptes clients", "comptes fournisseurs"], ["opentext-france-2026"]), formats: documented(["UBL", "CII", "Factur-X"], ["opentext-france-2026"]),
    importantUnknowns: ["Prix et volumes", "API publique", "Hébergement France", "Conditions de sortie"],
  }),
  expand({
    slug: "docuware", displayName: "DocuWare", officialName: "DOCUWARE", registeredAt: "2025-12-22",
    summary: "Gestion documentaire et workflows de factures reliés aux ERP et au réseau Peppol.",
    targets: ["pme", "eti", "ge"], ecosystem: ["GED", "workflows", "ERP", "Peppol", "archivage"],
    pricing: quote(), sendsInvoices: documented(true, ["docuware-pa-2026"]), receivesInvoices: documented(true, ["docuware-invoices-2026", "docuware-pa-2026"]), eReporting: documented(true, ["docuware-pa-2026"]), integrations: documented(["ERP", "logiciels comptables", "Peppol", "GED DocuWare"], ["docuware-invoices-2026"]), formats: declared(["Factur-X", "formats internationaux"], ["docuware-invoices-2026"]), exportDocumented: declared(true, ["docuware-invoices-2026"], "Le document original est annoncé comme accessible et archivé."),
    importantUnknowns: ["Prix et volumes", "Liste précise des formats", "API publique", "Engagement"],
  }),
  expand({
    slug: "tessi", displayName: "Digital Invoice by Tessi", officialName: "TESSI Technologies", registeredAt: "2025-12-11",
    summary: "Plateforme modulaire pour les cycles achats et ventes des ETI et grandes entreprises.",
    targets: ["eti", "ge"], ecosystem: ["P2P", "O2C", "Peppol", "archivage", "grands volumes"],
    pricing: quote(), sendsInvoices: documented(true, ["tessi-platform-2026", "tessi-compliance-2026"]), receivesInvoices: documented(true, ["tessi-platform-2026", "tessi-compliance-2026"]), eReporting: documented(true, ["tessi-compliance-2026"]), integrations: documented(["Peppol", "systèmes métiers", "P2P", "O2C"], ["tessi-platform-2026", "tessi-compliance-2026"]), iso27001: declared(true, ["tessi-compliance-2026"], "Tessi annonce ISO 27001 et ISO 27701 pour la solution."),
    importantUnknowns: ["Prix et volumes", "Formats exacts", "API publique", "Engagement"],
  }),
  expand({
    slug: "esalink", displayName: "EsaLink Hubtimize", officialName: "ESALINK", registeredAt: "2025-12-11",
    summary: "Plateforme EDI destinée à s'insérer dans les systèmes existants et à transformer les formats.",
    targets: ["pme", "eti", "ge"], ecosystem: ["EDI", "ERP", "GED", "CRM", "archivage"],
    pricing: quote(), sendsInvoices: documented(true, ["esalink-pa-2026"]), receivesInvoices: documented(true, ["esalink-pa-2026"]), eReporting: documented(true, ["esalink-pa-2026"]), integrations: documented(["EDI", "ERP", "GED", "CRM", "systèmes métiers"], ["esalink-pa-2026", "esalink-platform-2026"]), formats: declared(["Factur-X", "UBL", "CII", "formats EDI"], ["esalink-pa-2026"]), iso27001: declared(true, ["esalink-platform-2026"]),
    importantUnknowns: ["Prix et volumes", "API publique", "Portée des certifications", "Conditions de sortie"],
  }),
  expand({
    slug: "itesoft", displayName: "ITESOFT", officialName: "ITESOFT", registeredAt: "2026-01-15",
    summary: "Automatisation des factures fournisseurs et clients, portail fournisseur et connecteurs ERP.",
    targets: ["pme", "eti", "ge"], ecosystem: ["P2P", "O2C", "ERP", "Peppol", "détection de fraude"],
    pricing: quote(), sendsInvoices: documented(true, ["itesoft-invoices-2026"]), receivesInvoices: documented(true, ["itesoft-invoices-2026"]), eReporting: documented(true, ["itesoft-invoices-2026"]), integrations: documented(["plus de 250 ERP", "Peppol", "portail fournisseur"], ["itesoft-invoices-2026"]), formats: documented(["Factur-X", "UBL", "CII", "EDIFACT", "Galia", "EANCOM"], ["itesoft-invoices-2026"]), iso27001: declared(true, ["itesoft-invoices-2026"], "ITESOFT annonce une certification ISO 27001:2022."),
    importantUnknowns: ["Prix et volumes", "API publique", "Hébergement", "Engagement"],
  }),
  expand({
    slug: "chaintrust", displayName: "Chaintrust", officialName: "CHAINTRUST by Visma", registeredAt: "2025-12-18",
    summary: "Plateforme agréée de Visma France conçue pour le pilotage multi-dossiers des cabinets comptables.",
    targets: ["micro", "tpe", "pme"], ecosystem: ["cabinet comptable", "Visma", "production comptable", "API", "OCR"],
    pricing: unknown("Les tarifs publics de 5 € et 20 € par dossier couvrent le logiciel comptable, sans isoler clairement le prix de la PA."), sendsInvoices: documented(true, ["chaintrust-pa-2026"]), receivesInvoices: documented(true, ["chaintrust-pa-2026"]), eReporting: documented(true, ["chaintrust-pa-2026"]), accountantAccess: documented(true, ["chaintrust-pa-2026"]), publicApi: documented({ available: true, includedInFree: null }, ["chaintrust-pa-2026"]), integrations: documented(["Isacompta", "Sage", "Cegid", "ACD", "Quadratus", "Pennylane", "Fulll", "Inqom", "MyUnisoft", "API"], ["chaintrust-pa-2026"]), formats: documented(["Factur-X", "UBL", "CII"], ["chaintrust-pa-2026"]), hostingCountries: declared(["France"], ["chaintrust-pricing-2026"]), commitmentMonths: documented(0, ["chaintrust-pricing-2026"]),
    importantUnknowns: ["Prix propre à la PA", "Volumes", "Certificat ISO 27001", "Restitution complète"],
  }),
];
