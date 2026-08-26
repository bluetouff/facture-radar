import type { JourneyCostDefinition, JourneyProfileDefinition } from "./journey-profiles.ts";

const checkedAt = "2026-08-26";

export interface JourneyInput {
  id: JourneyProfileDefinition["id"];
  aliases: readonly string[];
  platformSlug: string;
  toolLabel: string;
  toolDetail: string;
  sourceIds: readonly string[];
  cost: JourneyCostDefinition;
  activation?: {
    question: string;
    todo: string;
    open: string;
    activate: string;
    check: string;
    sourceIds: readonly string[];
  };
  after?: readonly { title: string; detail: string; sourceIds: readonly string[] }[];
}

const allAudiences = (cost: JourneyCostDefinition) => ({
  micro: cost,
  "tpe-pme": cost,
  "eti-ge": cost,
});

export const free = (label: string, caveat: string, sourceIds: readonly string[]): JourneyCostDefinition => ({
  baseMonthlyFrom: 0,
  paMonthlySurcharge: 0,
  label,
  caveat,
  sourceIds,
});

export const paid = (amount: number, label: string, caveat: string, sourceIds: readonly string[]): JourneyCostDefinition => ({
  baseMonthlyFrom: amount,
  paMonthlySurcharge: null,
  label,
  caveat,
  sourceIds,
});

export const quote = (sourceIds: readonly string[], caveat = "Demandez un chiffrage écrit avec les volumes, l'intégration, l'engagement et la restitution des données."): JourneyCostDefinition => ({
  baseMonthlyFrom: null,
  paMonthlySurcharge: null,
  label: "Prix public non trouvé : devis nécessaire.",
  caveat,
  sourceIds,
});

export function journey(input: JourneyInput): JourneyProfileDefinition {
  const activation = input.activation ?? {
    question: `Votre entreprise est-elle déjà rattachée à ${input.toolLabel} comme plateforme agréée ?`,
    todo: `Le parcours public de rattachement n'est pas détaillé. Vérifiez le SIREN concerné et demandez à ${input.toolLabel} la confirmation écrite de l'inscription dans l'annuaire.`,
    open: `Ouvrez l'espace d'administration de ${input.toolLabel} ou contactez son support avec le SIREN de l'entreprise.`,
    activate: "Demandez le rattachement de la bonne entité et les éventuelles pièces nécessaires avant de valider.",
    check: "Contrôlez que le statut est actif pour le bon SIREN et demandez l'adresse de réception enregistrée.",
    sourceIds: input.sourceIds,
  };
  return {
    id: input.id,
    aliases: input.aliases,
    platformSlug: input.platformSlug,
    toolLabel: input.toolLabel,
    toolDetail: input.toolDetail,
    checkedAt,
    toolSourceIds: input.sourceIds,
    contextSourceIds: input.sourceIds,
    activation: {
      label: "Rattachement",
      question: activation.question,
      yesValue: "Actif d'après votre réponse",
      noValue: "À activer",
      unknownValue: `À vérifier avec ${input.toolLabel}`,
      yesDetail: `Votre réponse indique que ${input.toolLabel} est déjà désignée. Contrôlez tout de même le SIREN et l'adresse de réception affichés.`,
      todoDetail: activation.todo,
      sourceIds: activation.sourceIds,
      openAction: { title: `Ouvrez ${input.toolLabel}`, detail: activation.open, sourceIds: activation.sourceIds },
      activateAction: { title: "Rattachez la bonne entreprise", detail: activation.activate, sourceIds: activation.sourceIds },
      checkAction: { title: "Contrôlez le résultat", detail: activation.check, sourceIds: activation.sourceIds },
    },
    costByAudience: allAudiences(input.cost),
    afterActivationActions: input.after ?? [{
      title: "Testez une vraie réception",
      detail: `Faites envoyer une facture de test vers ${input.toolLabel}, puis vérifiez le document et son statut sans attendre votre échéance.`,
      sourceIds: [],
    }],
  };
}

export const expandedJourneyProfiles: readonly JourneyProfileDefinition[] = [
  journey({
    id: "b2brouter", aliases: ["B2BRouter", "B2B Router"], platformSlug: "b2brouter", toolLabel: "B2BRouter",
    toolDetail: "Application web et API de facturation électronique.", sourceIds: ["b2brouter-pricing-2026", "b2brouter-france-api-2026"],
    cost: free("Basic est gratuit jusqu'à 24 transactions par an.", "Au-delà, Professional est affiché à 110 € HT par an. Une transaction inclut envoi, réception ou déclaration fiscale.", ["b2brouter-pricing-2026"]),
  }),
  journey({
    id: "dext", aliases: ["Dext", "Dext Prepare"], platformSlug: "dext", toolLabel: "Dext",
    toolDetail: "Collecte et préparation comptable pour entreprises et cabinets.", sourceIds: ["dext-pa-2026", "dext-send-electronic-2026"],
    cost: free("Le compte gratuit inclut la facturation électronique et l'e-reporting.", "L'offre complète affichée à 25 € HT par mois ajoute OCR et automatisation pour 250 documents mensuels.", ["dext-pricing-2026"]),
    activation: {
      question: "Votre entreprise a-t-elle désigné Dext et, si un cabinet agit pour vous, le mandat est-il signé ?",
      todo: "Dext demande la désignation de la plateforme. Lorsqu'un cabinet agit pour son client, un mandat signé est nécessaire.",
      open: "Ouvrez la rubrique Facturation électronique dans Dext et sélectionnez l'entreprise concernée.",
      activate: "Validez la désignation. Si votre cabinet effectue la démarche, faites signer le mandat demandé.",
      check: "Vérifiez que le SIREN est inscrit et que Dext apparaît comme plateforme active.",
      sourceIds: ["dext-pa-2026"],
    },
  }),
  journey({
    id: "dougs", aliases: ["Dougs", "Dougs Facturation"], platformSlug: "dougs", toolLabel: "Dougs Facturation",
    toolDetail: "Outil web et mobile de facturation pour entrepreneurs.", sourceIds: ["dougs-free-2026"],
    cost: free("Facturation électronique gratuite et annoncée sans limite.", "Les services comptables de Dougs ne sont pas inclus dans ce coût.", ["dougs-free-2026"]),
  }),
  journey({
    id: "billit", aliases: ["Billit"], platformSlug: "billit", toolLabel: "Billit",
    toolDetail: "Facturation connectée au réseau Peppol.", sourceIds: ["billit-pricing-2026", "billit-france-api-2026"],
    cost: free("L'envoi des factures de vente est gratuit.", "La réception et les autres fonctions nécessitent l'offre complète, affichée à partir de 7,50 € HT par mois.", ["billit-pricing-2026"]),
  }),
  journey({
    id: "ipaidthat", aliases: ["iPaidThat", "I Paid That"], platformSlug: "ipaidthat", toolLabel: "iPaidThat",
    toolDetail: "Pré-comptabilité, facturation et trésorerie.", sourceIds: ["ipaidthat-pa-2026", "ipaidthat-pricing-2026"],
    cost: paid(59, "Essentiel est affiché à 59 € HT par mois pour 100 factures.", "Pro passe à 99 € pour 200 factures et Pro+ à 209 € pour 400. Vérifiez le coût au-delà.", ["ipaidthat-pricing-2026"]),
    activation: {
      question: "Avez-vous validé les informations de votre société dans le parcours PA iPaidThat ?",
      todo: "iPaidThat indique qu'il faut se connecter, valider les informations en ligne puis finaliser l'enregistrement proposé.",
      open: "Connectez-vous à iPaidThat et ouvrez le parcours de facturation électronique.",
      activate: "Contrôlez les informations de l'entreprise puis validez la demande d'enregistrement.",
      check: "Vérifiez que l'enregistrement officiel est terminé, et pas seulement la demande initiale.",
      sourceIds: ["ipaidthat-pa-2026"],
    },
  }),
  journey({ id: "agicap", aliases: ["Agicap"], platformSlug: "agicap", toolLabel: "Agicap", toolDetail: "Trésorerie, achats, recouvrement et facturation électronique.", sourceIds: ["agicap-pa-2026", "agicap-api-2026"], cost: quote(["agicap-pricing-2026"], "L'offre est annuelle. L'API France est publique en bac à sable, mais sa production est encore limitée au pilote selon la documentation consultée.") }),
  journey({ id: "spendesk", aliases: ["Spendesk"], platformSlug: "spendesk", toolLabel: "Spendesk", toolDetail: "Gestion des dépenses et factures fournisseurs.", sourceIds: ["spendesk-pa-2026"], cost: quote(["spendesk-pa-2026"], "La page publique documente surtout la réception. Faites chiffrer séparément les autres modules et confirmez l'émission si vous en avez besoin."), after: [{ title: "Validez le périmètre avant de choisir", detail: "La réception est documentée. Si vous devez aussi émettre des factures clients ou faire de l'e-reporting, demandez une confirmation écrite de ces deux fonctions.", sourceIds: ["spendesk-pa-2026"] }] }),
  journey({
    id: "lucca", aliases: ["Lucca", "Lucca Factures"], platformSlug: "lucca", toolLabel: "Lucca Factures",
    toolDetail: "Traitement des factures fournisseurs dans la suite Lucca.", sourceIds: ["lucca-invoices-2026", "lucca-activation-2026"],
    cost: paid(.91, "Exemple public à 0,91 € HT par facture pour 600 à 799 factures.", "Le prix est dégressif et facturé à la consommation réelle. La PA est incluse sans surcoût dans plusieurs abonnements Lucca.", ["lucca-pricing-2026", "lucca-activation-2026"]),
    activation: {
      question: "L'unité légale est-elle inscrite dans Lucca PA avec son SIREN et ses adresses de réception ?",
      todo: "Lucca demande un SIREN par unité légale, le numéro de TVA, le régime de TVA, un Kbis récent et une pièce d'identité.",
      open: "Ouvrez l'application Lucca Plateforme agréée avec le droit de gérer l'inscription et les adresses de routage.",
      activate: "Vérifiez chaque unité légale, préparez les justificatifs puis suivez l'inscription proposée.",
      check: "Contrôlez le SIREN, le statut et les adresses de réception enregistrées dans l'annuaire.",
      sourceIds: ["lucca-activation-2026"],
    },
    after: [{ title: "Vérifiez votre besoin d'émission", detail: "La documentation publique retenue couvre la réception fournisseur et l'e-reporting. Si vous émettez des factures clients, confirmez le parcours prévu avec Lucca.", sourceIds: ["lucca-invoices-2026"] }],
  }),
  journey({ id: "n2f", aliases: ["N2F", "N2F PDP"], platformSlug: "n2f", toolLabel: "N2F", toolDetail: "Factures fournisseurs et notes de frais.", sourceIds: ["n2f-pa-2026"], cost: quote(["n2f-pa-2026"], "Demandez si l'émission client passe par votre outil actuel ou par l'API N2F, qui attend des données déjà structurées.") }),
  journey({ id: "flowie", aliases: ["Flowie"], platformSlug: "flowie", toolLabel: "Flowie", toolDetail: "Achats, ventes, recouvrement et trésorerie.", sourceIds: ["flowie-france-2026", "flowie-sales-2026"], cost: quote(["flowie-smb-2026"], "Le prix dépend du nombre de documents. Demandez une grille complète et faites clarifier l'ancienne page qui mentionne encore une candidature PA.") }),
  journey({ id: "axelor", aliases: ["Axelor", "Axelor ERP"], platformSlug: "axelor", toolLabel: "Axelor", toolDetail: "ERP open source avec facturation électronique intégrée.", sourceIds: ["axelor-pa-2026"], cost: quote(["axelor-pa-2026"]) }),
  journey({ id: "a-cube", aliases: ["A-Cube", "ACube"], platformSlug: "a-cube", toolLabel: "A-Cube", toolDetail: "API de conformité pour éditeurs et équipes techniques.", sourceIds: ["acube-france-api-2026", "acube-formats-2026"], cost: quote(["acube-france-api-2026"], "Le bac à sable est gratuit. Demandez le prix de production et la date de disponibilité du Factur-X sortant."), after: [{ title: "Testez le format réellement envoyé", detail: "A-Cube documente UBL et CII en sortie. Le Factur-X sortant est encore annoncé prochainement sur la page consultée.", sourceIds: ["acube-formats-2026"] }] }),
  journey({ id: "invopop", aliases: ["Invopop"], platformSlug: "invopop", toolLabel: "Invopop", toolDetail: "API internationale de conformité à la consommation.", sourceIds: ["invopop-france-2026", "invopop-pricing-2026"], cost: free("Le plan Dev inclut 200 Pops par mois.", "Une facture ou un statut France consomme plusieurs Pops. Le plan Pro ajoute 500 € par mois, plus consommation et applications.", ["invopop-pricing-2026", "invopop-france-2026"]), after: [{ title: "Confirmez l'e-reporting avant la production", detail: "La documentation France le présente encore en développement actif. Ne le considérez pas disponible sans confirmation récente.", sourceIds: ["invopop-france-2026"] }] }),
  journey({ id: "storecove", aliases: ["Storecove", "Store Cove"], platformSlug: "storecove", toolLabel: "Storecove", toolDetail: "API mondiale de facturation électronique.", sourceIds: ["storecove-france-2026", "storecove-api-2026"], cost: quote(["storecove-france-2026"], "Un environnement de test de 30 jours est annoncé. Le prix et les volumes de production ne sont pas publiés.") }),
  journey({ id: "pagero", aliases: ["Pagero", "ONESOURCE Pagero", "Thomson Reuters Pagero"], platformSlug: "pagero", toolLabel: "ONESOURCE Pagero", toolDetail: "Réseau mondial de conformité pour les ERP.", sourceIds: ["pagero-france-2026", "pagero-connectivity-2026"], cost: quote(["pagero-france-2026"]) }),
  journey({ id: "basware", aliases: ["Basware"], platformSlug: "basware", toolLabel: "Basware", toolDetail: "Automatisation fournisseurs et réseau mondial.", sourceIds: ["basware-france-2026", "basware-mandate-2026"], cost: quote(["basware-france-2026"]) }),
  journey({ id: "avalara", aliases: ["Avalara", "Avalara ELR"], platformSlug: "avalara", toolLabel: "Avalara", toolDetail: "API de conformité fiscale internationale.", sourceIds: ["avalara-france-api-2026", "avalara-france-formats-2026"], cost: quote(["avalara-france-api-2026"]) }),
  journey({ id: "comarch", aliases: ["Comarch", "Comarch e-Invoicing"], platformSlug: "comarch", toolLabel: "Comarch", toolDetail: "EDI et conformité pour ERP internationaux.", sourceIds: ["comarch-france-2026", "comarch-registration-2026"], cost: quote(["comarch-france-2026"]) }),
  journey({ id: "edicom", aliases: ["EDICOM"], platformSlug: "edicom", toolLabel: "EDICOM", toolDetail: "Plateforme mondiale EDI et conformité fiscale.", sourceIds: ["edicom-platform-2026", "edicom-france-2026"], cost: quote(["edicom-platform-2026"]) }),
  journey({ id: "opentext", aliases: ["OpenText", "Open Text", "OpenText Trading Grid"], platformSlug: "opentext", toolLabel: "OpenText", toolDetail: "Réseau B2B mondial pour comptes clients et fournisseurs.", sourceIds: ["opentext-france-2026"], cost: quote(["opentext-france-2026"]) }),
  journey({ id: "docuware", aliases: ["DocuWare", "Docu Ware"], platformSlug: "docuware", toolLabel: "DocuWare", toolDetail: "GED et workflows de factures reliés aux ERP.", sourceIds: ["docuware-invoices-2026", "docuware-pa-2026"], cost: quote(["docuware-pa-2026"]) }),
  journey({ id: "tessi", aliases: ["Tessi", "Digital Invoice by Tessi", "Digital Invoice"], platformSlug: "tessi", toolLabel: "Digital Invoice by Tessi", toolDetail: "P2P et O2C pour ETI et grandes entreprises.", sourceIds: ["tessi-platform-2026", "tessi-compliance-2026"], cost: quote(["tessi-platform-2026"]) }),
  journey({ id: "esalink", aliases: ["EsaLink", "Hubtimize", "Hubtimize e-Invoicing"], platformSlug: "esalink", toolLabel: "EsaLink Hubtimize", toolDetail: "EDI, transformation de formats et supervision.", sourceIds: ["esalink-pa-2026", "esalink-platform-2026"], cost: quote(["esalink-pa-2026"]) }),
  journey({ id: "itesoft", aliases: ["ITESOFT", "Streamline Invoices"], platformSlug: "itesoft", toolLabel: "ITESOFT", toolDetail: "Automatisation fournisseurs et clients, connectée aux ERP.", sourceIds: ["itesoft-invoices-2026"], cost: quote(["itesoft-invoices-2026"]) }),
  journey({ id: "chaintrust", aliases: ["Chaintrust", "Chain Trust"], platformSlug: "chaintrust", toolLabel: "Chaintrust", toolDetail: "Plateforme Visma France pour les cabinets comptables.", sourceIds: ["chaintrust-pa-2026", "chaintrust-pricing-2026"], cost: quote(["chaintrust-pa-2026", "chaintrust-pricing-2026"], "Les prix de 5 € et 20 € par dossier concernent le logiciel comptable. Le coût propre à la PA n'est pas isolé publiquement."), activation: { question: "Le dossier client est-il désigné sur le dashboard Chaintrust ?", todo: "Chaintrust propose un espace central pour enregistrer les clients, choisir leur plateforme et signer les documents requis.", open: "Ouvrez le dashboard de désignation Chaintrust et recherchez le dossier concerné.", activate: "Vérifiez le SIREN, choisissez la plateforme puis faites signer les documents demandés.", check: "Contrôlez le statut du dossier et la bonne remontée dans le logiciel de production comptable.", sourceIds: ["chaintrust-pa-2026"] } }),
];
