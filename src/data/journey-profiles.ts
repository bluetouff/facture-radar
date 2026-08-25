export type JourneyAudience = "micro" | "tpe-pme" | "eti-ge";
export type JourneyProfileId = "tiime" | "sage-50" | "abby" | "indy" | "pennylane" | "qonto" | "superpdp";

export interface JourneyActionDefinition {
  title: string;
  detail: string;
  sourceIds: readonly string[];
}

export interface JourneyCostDefinition {
  baseMonthlyFrom: number;
  paMonthlySurcharge: number;
  label: string;
  caveat: string;
  sourceIds: readonly string[];
}

export interface JourneyProfileDefinition {
  id: JourneyProfileId;
  aliases: readonly string[];
  platformSlug: string;
  toolLabel: string;
  toolDetail: string;
  checkedAt: string;
  toolSourceIds: readonly string[];
  contextSourceIds: readonly string[];
  activation: {
    label: string;
    question: string;
    yesValue: string;
    noValue: string;
    unknownValue: string;
    yesDetail: string;
    todoDetail: string;
    sourceIds: readonly string[];
    openAction: JourneyActionDefinition;
    activateAction: JourneyActionDefinition;
    checkAction: JourneyActionDefinition;
  };
  costByAudience: Record<JourneyAudience, JourneyCostDefinition>;
  afterActivationActions: readonly JourneyActionDefinition[];
}

const allAudiences = (cost: JourneyCostDefinition): Record<JourneyAudience, JourneyCostDefinition> => ({
  micro: cost,
  "tpe-pme": cost,
  "eti-ge": cost,
});

const testReceipt = (toolLabel: string): JourneyActionDefinition => ({
  title: "Préparez un test réel",
  detail: `Avant votre échéance, contrôlez la réception d'une facture fournisseur dans ${toolLabel}.`,
  sourceIds: [],
});

const freeCost = (label: string, caveat: string, sourceIds: readonly string[]): JourneyCostDefinition => ({
  baseMonthlyFrom: 0,
  paMonthlySurcharge: 0,
  label,
  caveat,
  sourceIds,
});

export const journeyProfiles: readonly JourneyProfileDefinition[] = [
  {
    id: "tiime",
    aliases: ["Tiime", "Tiime Invoice"],
    platformSlug: "tiime",
    toolLabel: "Tiime",
    toolDetail: "Logiciel de facturation utilisé au quotidien.",
    checkedAt: "2026-08-25",
    toolSourceIds: ["tiime-pa-2026"],
    contextSourceIds: [],
    activation: {
      label: "Rattachement",
      question: "Votre espace Tiime indique-t-il que Tiime est votre plateforme agréée active ?",
      yesValue: "Actif d'après votre réponse",
      noValue: "À activer",
      unknownValue: "À vérifier dans Tiime",
      yesDetail: "Cette information vient de votre réponse et reste consultable dans votre espace Tiime.",
      todoDetail: "L'activation passe par la validation du mandat proposé dans votre espace Tiime.",
      sourceIds: ["tiime-pa-2026"],
      openAction: { title: "Ouvrez votre espace Tiime", detail: "Accédez à la rubrique consacrée à la plateforme agréée.", sourceIds: ["tiime-pa-2026"] },
      activateAction: { title: "Validez le mandat", detail: "Choisissez Tiime comme plateforme agréée pour votre entreprise.", sourceIds: ["tiime-pa-2026"] },
      checkAction: { title: "Contrôlez le statut affiché", detail: "Vérifiez que votre entreprise est bien indiquée comme rattachée à Tiime PA.", sourceIds: ["tiime-pa-2026"] },
    },
    costByAudience: allAudiences(freeCost(
      "Offre gratuite, factures annoncées sans limite et sans engagement.",
      "Les modules optionnels, le compte professionnel et les services payants ne sont pas inclus dans ce calcul.",
      ["tiime-pricing-2026", "tiime-pa-2026"],
    )),
    afterActivationActions: [testReceipt("Tiime")],
  },
  {
    id: "sage-50",
    aliases: ["Sage 50", "Sage50"],
    platformSlug: "sage",
    toolLabel: "Sage 50",
    toolDetail: "Le produit figure parmi les logiciels Sage compatibles présentés par l'éditeur.",
    checkedAt: "2026-08-25",
    toolSourceIds: ["sage-products-2026"],
    contextSourceIds: [],
    activation: {
      label: "Inscription",
      question: "Avez-vous finalisé l'inscription de votre entreprise à la Plateforme Agréée Sage ?",
      yesValue: "Finalisée d'après votre réponse",
      noValue: "À finaliser",
      unknownValue: "À vérifier avec votre identifiant Sage",
      yesDetail: "Cette information vient de votre réponse. Le statut reste à contrôler dans votre espace Sage.",
      todoDetail: "Sage demande aux clients de finaliser l'inscription avec leur identifiant Sage.",
      sourceIds: ["sage-pa-2026", "sage-products-2026"],
      openAction: { title: "Connectez-vous avec votre identifiant Sage", detail: "Ouvrez le parcours d'inscription proposé depuis votre environnement Sage.", sourceIds: ["sage-pa-2026"] },
      activateAction: { title: "Finalisez l'inscription", detail: "Vérifiez l'entreprise concernée et validez la Plateforme Agréée Sage.", sourceIds: ["sage-pa-2026", "sage-products-2026"] },
      checkAction: { title: "Contrôlez le statut Sage", detail: "Vérifiez que l'inscription concerne la bonne entreprise et la bonne édition de Sage 50.", sourceIds: ["sage-pa-2026", "sage-products-2026"] },
    },
    costByAudience: allAudiences({
      baseMonthlyFrom: 18,
      paMonthlySurcharge: 0,
      label: "Sage 50 est affiché à partir de 18 € HT par mois et la plateforme agréée sans surcoût.",
      caveat: "C'est un minimum public, pas le montant de votre contrat. Les options, la migration et les limites propres à votre édition ne sont pas chiffrées.",
      sourceIds: ["sage-products-2026", "sage-pa-2026"],
    }),
    afterActivationActions: [
      { title: "Vérifiez les limites de votre contrat", detail: "Demandez les volumes inclus et les éventuels coûts au-delà, qui ne sont pas publiés pour chaque édition.", sourceIds: [] },
      testReceipt("Sage 50"),
    ],
  },
  {
    id: "abby",
    aliases: ["Abby"],
    platformSlug: "abby",
    toolLabel: "Abby",
    toolDetail: "Outil de facturation et de gestion destiné aux indépendants et petites entreprises.",
    checkedAt: "2026-08-25",
    toolSourceIds: ["abby-electronic-invoicing-2026"],
    contextSourceIds: [],
    activation: {
      label: "Mandat",
      question: "Dans Abby, avez-vous signé le mandat qui désigne Abby comme plateforme agréée ?",
      yesValue: "Signé d'après votre réponse",
      noValue: "À signer",
      unknownValue: "À vérifier dans Abby",
      yesDetail: "Cette information vient de votre réponse. Le statut reste visible dans votre espace Abby.",
      todoDetail: "L'activation se fait depuis l'onglet Facturation électronique, avec une vérification d'identité puis la signature du mandat.",
      sourceIds: ["abby-activation-2026", "abby-electronic-invoicing-2026"],
      openAction: { title: "Ouvrez Facturation électronique", detail: "Dans Abby, cliquez sur Activer la facturation électronique.", sourceIds: ["abby-activation-2026"] },
      activateAction: { title: "Vérifiez puis signez", detail: "Contrôlez les informations de l'entreprise, terminez la vérification d'identité et signez le mandat.", sourceIds: ["abby-activation-2026"] },
      checkAction: { title: "Contrôlez le statut Abby", detail: "Vérifiez que le mandat est signé pour la bonne entreprise.", sourceIds: ["abby-activation-2026"] },
    },
    costByAudience: allAudiences(freeCost(
      "L'offre Basique inclut gratuitement les fonctions de facturation électronique, sans limitation annoncée.",
      "Les fonctions avancées des offres Start, Pro et Business ne sont pas incluses dans ce calcul.",
      ["abby-pricing-2026", "abby-electronic-invoicing-2026"],
    )),
    afterActivationActions: [testReceipt("Abby")],
  },
  {
    id: "indy",
    aliases: ["Indy"],
    platformSlug: "indy",
    toolLabel: "Indy",
    toolDetail: "Outil de facturation et de gestion destiné aux indépendants.",
    checkedAt: "2026-08-25",
    toolSourceIds: ["indy-invoicing-2026"],
    contextSourceIds: [],
    activation: {
      label: "Inscription",
      question: "L'onglet Factures électroniques d'Indy indique-t-il que votre inscription est terminée ?",
      yesValue: "Terminée d'après votre réponse",
      noValue: "À terminer",
      unknownValue: "À vérifier dans Indy",
      yesDetail: "Cette information vient de votre réponse. Le statut reste visible dans votre espace Indy.",
      todoDetail: "Indy ouvre le parcours depuis Facturation, puis Factures électroniques et le bouton S'inscrire.",
      sourceIds: ["indy-activation-2026"],
      openAction: { title: "Ouvrez Factures électroniques", detail: "Dans Indy, rendez-vous dans Facturation puis Factures électroniques.", sourceIds: ["indy-activation-2026"] },
      activateAction: { title: "Lancez l'inscription", detail: "Cliquez sur S'inscrire et suivez les étapes affichées pour votre entreprise.", sourceIds: ["indy-activation-2026"] },
      checkAction: { title: "Contrôlez le statut Indy", detail: "Vérifiez que l'inscription est terminée pour la bonne entreprise.", sourceIds: ["indy-activation-2026"] },
    },
    costByAudience: allAudiences(freeCost(
      "Facturation électronique et activation de la plateforme agréée annoncées gratuites, avec factures illimitées.",
      "Le compte professionnel et les services comptables optionnels ne sont pas inclus dans ce calcul.",
      ["indy-invoicing-2026", "indy-billing-2026", "indy-activation-2026"],
    )),
    afterActivationActions: [testReceipt("Indy")],
  },
  {
    id: "pennylane",
    aliases: ["Pennylane"],
    platformSlug: "pennylane",
    toolLabel: "Pennylane",
    toolDetail: "Logiciel de facturation et de gestion financière pour entreprises et cabinets.",
    checkedAt: "2026-08-25",
    toolSourceIds: ["pennylane-main-2026"],
    contextSourceIds: [],
    activation: {
      label: "Mandat",
      question: "Dans Pennylane, avez-vous signé le mandat d'activation de la plateforme agréée ?",
      yesValue: "Signé d'après votre réponse",
      noValue: "À signer",
      unknownValue: "À vérifier dans Pennylane",
      yesDetail: "Cette information vient de votre réponse. Le statut reste à contrôler dans votre espace Pennylane.",
      todoDetail: "Pennylane indique que l'activation passe par la signature en ligne du mandat.",
      sourceIds: ["pennylane-main-2026"],
      openAction: { title: "Ouvrez le parcours PA", detail: "Accédez à l'activation de la plateforme agréée dans Pennylane.", sourceIds: ["pennylane-main-2026"] },
      activateAction: { title: "Signez le mandat", detail: "Vérifiez l'entreprise concernée puis signez le mandat en ligne.", sourceIds: ["pennylane-main-2026"] },
      checkAction: { title: "Contrôlez l'adresse de réception", detail: "Vérifiez que l'activation est terminée et que l'adresse de réception a été générée.", sourceIds: ["pennylane-main-2026"] },
    },
    costByAudience: {
      micro: freeCost(
        "Plan à 0 € réservé aux micro-entrepreneurs, avec 1 utilisateur et 1 200 factures par an.",
        "Les fonctions hors plan gratuit et tout dépassement du périmètre publié ne sont pas inclus.",
        ["pennylane-free-2026", "pennylane-main-2026"],
      ),
      "tpe-pme": {
        baseMonthlyFrom: 7,
        paMonthlySurcharge: 0,
        label: "Pour les entreprises hors plan micro, les offres incluant la facturation électronique commencent à 7 € HT par mois.",
        caveat: "C'est un prix d'appel public. Le coût réel dépend des utilisateurs, modules et besoins de collaboration.",
        sourceIds: ["pennylane-main-2026"],
      },
      "eti-ge": {
        baseMonthlyFrom: 7,
        paMonthlySurcharge: 0,
        label: "Les offres incluant la facturation électronique sont affichées à partir de 7 € HT par mois.",
        caveat: "Ce prix d'appel ne constitue pas un devis pour une ETI ou une grande entreprise.",
        sourceIds: ["pennylane-main-2026"],
      },
    },
    afterActivationActions: [
      { title: "Vérifiez votre plan", detail: "Contrôlez la limite de factures, le nombre d'utilisateurs et les fonctions de collaboration incluses.", sourceIds: ["pennylane-free-2026", "pennylane-main-2026"] },
      testReceipt("Pennylane"),
    ],
  },
  {
    id: "qonto",
    aliases: ["Qonto", "Qonto Facturation"],
    platformSlug: "qonto",
    toolLabel: "Qonto Facturation",
    toolDetail: "Outil de facturation utilisable avec ou sans compte professionnel Qonto.",
    checkedAt: "2026-08-25",
    toolSourceIds: ["qonto-invoicing-2026", "qonto-billing-2026"],
    contextSourceIds: ["qonto-flow-2026", "qonto-ereporting-2026"],
    activation: {
      label: "Enregistrement",
      question: "Dans Paramètres > Facturation électronique, Qonto est-il indiqué comme votre plateforme agréée ?",
      yesValue: "Enregistré d'après votre réponse",
      noValue: "À enregistrer",
      unknownValue: "À vérifier dans Qonto",
      yesDetail: "Cette information vient de votre réponse. Le statut reste visible dans les paramètres Qonto.",
      todoDetail: "Qonto demande un enregistrement unique depuis Paramètres, puis Facturation électronique.",
      sourceIds: ["qonto-flow-2026"],
      openAction: { title: "Ouvrez les paramètres Qonto", detail: "Rendez-vous dans Paramètres puis Facturation électronique.", sourceIds: ["qonto-flow-2026"] },
      activateAction: { title: "Enregistrez Qonto comme PA", detail: "Complétez l'inscription à l'annuaire national depuis cet écran.", sourceIds: ["qonto-flow-2026"] },
      checkAction: { title: "Contrôlez le statut Qonto", detail: "Vérifiez que l'inscription n'est plus indiquée comme En cours.", sourceIds: ["qonto-flow-2026"] },
    },
    costByAudience: allAudiences(freeCost(
      "Facturation électronique gratuite et annoncée sans limite, avec ou sans compte professionnel Qonto.",
      "Les services bancaires et autres modules payants ne sont pas inclus dans ce calcul.",
      ["qonto-invoicing-2026", "qonto-billing-2026", "qonto-flow-2026"],
    )),
    afterActivationActions: [testReceipt("Qonto")],
  },
  {
    id: "superpdp",
    aliases: ["SuperPDP", "Super PDP"],
    platformSlug: "superpdp",
    toolLabel: "SuperPDP",
    toolDetail: "Compte en ligne ou API technique dédiée aux flux de facturation électronique.",
    checkedAt: "2026-08-25",
    toolSourceIds: ["superpdp-home-2026", "superpdp-features-2026"],
    contextSourceIds: ["superpdp-production-2026"],
    activation: {
      label: "Annuaire",
      question: "Votre entreprise est-elle indiquée comme inscrite dans l'annuaire depuis SuperPDP ?",
      yesValue: "Inscrite d'après votre réponse",
      noValue: "À inscrire",
      unknownValue: "À vérifier dans SuperPDP",
      yesDetail: "Cette information vient de votre réponse. Le statut reste à contrôler dans votre compte SuperPDP.",
      todoDetail: "L'inscription passe par la création du compte, l'ajout de l'entreprise et la case d'inscription à l'annuaire.",
      sourceIds: ["superpdp-production-2026"],
      openAction: { title: "Ouvrez votre compte SuperPDP", detail: "Ajoutez l'entreprise concernée si elle n'apparaît pas encore.", sourceIds: ["superpdp-production-2026"] },
      activateAction: { title: "Demandez l'inscription à l'annuaire", detail: "Lors de l'ajout de l'entreprise, cochez l'inscription à l'annuaire.", sourceIds: ["superpdp-production-2026"] },
      checkAction: { title: "Contrôlez l'inscription", detail: "Vérifiez que l'entreprise est bien enregistrée pour recevoir ses factures.", sourceIds: ["superpdp-production-2026"] },
    },
    costByAudience: allAudiences(freeCost(
      "Compte gratuit jusqu'à 1 000 factures par mois.",
      "La vérification KYC/KYB est affichée à 2 € HT. Au-delà de 1 000 factures par mois, la tarification API s'applique.",
      ["superpdp-pricing-2026"],
    )),
    afterActivationActions: [
      { title: "Surveillez votre volume", detail: "Vérifiez que votre entreprise reste sous 1 000 factures par mois ou anticipez la tarification API.", sourceIds: ["superpdp-pricing-2026"] },
      testReceipt("SuperPDP"),
    ],
  },
];

export function collectJourneySourceIds(profile: JourneyProfileDefinition): string[] {
  return [...new Set([
    ...profile.toolSourceIds,
    ...profile.contextSourceIds,
    ...profile.activation.sourceIds,
    ...profile.activation.openAction.sourceIds,
    ...profile.activation.activateAction.sourceIds,
    ...profile.activation.checkAction.sourceIds,
    ...Object.values(profile.costByAudience).flatMap((cost) => cost.sourceIds),
    ...profile.afterActivationActions.flatMap((action) => action.sourceIds),
  ])];
}
