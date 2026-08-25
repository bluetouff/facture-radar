export type JourneyAudience = "micro" | "tpe-pme" | "eti-ge";
export type JourneyProfileId =
  | "tiime"
  | "sage-50"
  | "abby"
  | "indy"
  | "pennylane"
  | "qonto"
  | "superpdp"
  | "sellsy"
  | "septeo"
  | "cegid"
  | "myunisoft"
  | "sap"
  | "generix"
  | "esker"
  | "cegedim";

export interface JourneyActionDefinition {
  title: string;
  detail: string;
  sourceIds: readonly string[];
}

export interface JourneyCostDefinition {
  baseMonthlyFrom: number | null;
  paMonthlySurcharge: number | null;
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

const quoteCost = (label: string, caveat: string, sourceIds: readonly string[]): JourneyCostDefinition => ({
  baseMonthlyFrom: null,
  paMonthlySurcharge: null,
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
  {
    id: "sellsy",
    aliases: ["Sellsy", "TeamSystem Sellsy"],
    platformSlug: "sellsy",
    toolLabel: "Sellsy",
    toolDetail: "Suite de gestion et de facturation pour TPE et PME.",
    checkedAt: "2026-08-25",
    toolSourceIds: ["sellsy-invoicing-2026", "sellsy-pa-2026"],
    contextSourceIds: ["sellsy-pilot-2026"],
    activation: {
      label: "Mandat et réception",
      question: "Dans Sellsy, le mandat d'émission est-il signé et la réception activée pour cette entreprise ?",
      yesValue: "Terminés d'après votre réponse",
      noValue: "À terminer",
      unknownValue: "À vérifier dans Sellsy",
      yesDetail: "Cette information vient de votre réponse. Les deux statuts restent à contrôler dans le compte Sellsy concerné.",
      todoDetail: "Sellsy distingue le mandat d'émission et l'activation guidée de la réception.",
      sourceIds: ["sellsy-activation-2026", "sellsy-reception-2026"],
      openAction: { title: "Ouvrez la déclaration PA", detail: "Dans Sellsy, ouvrez Facturation électronique ou Réglages > Société > Déclaration PA.", sourceIds: ["sellsy-activation-2026"] },
      activateAction: { title: "Signez et activez la réception", detail: "Faites signer le mandat par le représentant légal, puis terminez le parcours guidé de réception.", sourceIds: ["sellsy-activation-2026", "sellsy-reception-2026"] },
      checkAction: { title: "Contrôlez les prérequis", detail: "Vérifiez la bonne société, le mandat, la licence Facturation et les contrôles demandés par Sellsy.", sourceIds: ["sellsy-activation-2026", "sellsy-pilot-2026"] },
    },
    costByAudience: allAudiences({
      baseMonthlyFrom: 49,
      paMonthlySurcharge: 0,
      label: "L'offre Standard est affichée à partir de 49 € HT par utilisateur et par mois. Sellsy annonce la facturation électronique incluse dans l'abonnement.",
      caveat: "Le calcul porte sur un seul utilisateur, avec un engagement public de 12 mois. Les volumes inclus et le coût d'un périmètre plus large restent à confirmer.",
      sourceIds: ["sellsy-pricing-2026", "sellsy-invoicing-2026"],
    }),
    afterActivationActions: [
      { title: "Vérifiez votre accès opérationnel", detail: "Le pilote est ouvert progressivement. Contrôlez que votre compte peut finaliser une facture électronique ou demandez sa date d'ouverture.", sourceIds: ["sellsy-pilot-2026"] },
      testReceipt("Sellsy"),
    ],
  },
  {
    id: "septeo",
    aliases: ["Septeo Ingeneo", "Septeo", "Ingeneo"],
    platformSlug: "septeo",
    toolLabel: "Septeo Ingeneo",
    toolDetail: "Plateforme reliée aux cabinets et à leurs dossiers clients.",
    checkedAt: "2026-08-25",
    toolSourceIds: ["septeo-pa-2026"],
    contextSourceIds: [],
    activation: {
      label: "Mandat numérique",
      question: "Le mandat numérique de cette entreprise est-il signé dans Septeo Ingeneo ?",
      yesValue: "Signé d'après votre réponse",
      noValue: "À signer",
      unknownValue: "À vérifier dans le tableau de conformité",
      yesDetail: "Cette information vient de votre réponse. Le tableau de conformité reste la référence pour le dossier concerné.",
      todoDetail: "Septeo prévoit une inscription individuelle ou en masse à partir de mandats numériques.",
      sourceIds: ["septeo-pa-2026"],
      openAction: { title: "Ouvrez le tableau de conformité", detail: "Retrouvez l'entreprise concernée dans le suivi des dossiers clients.", sourceIds: ["septeo-pa-2026"] },
      activateAction: { title: "Envoyez puis signez le mandat", detail: "Lancez le mandat numérique pour cette entreprise et faites-le signer par la personne habilitée.", sourceIds: ["septeo-pa-2026"] },
      checkAction: { title: "Contrôlez l'inscription", detail: "Vérifiez que le mandat est validé et que l'entreprise apparaît inscrite dans l'annuaire.", sourceIds: ["septeo-pa-2026"] },
    },
    costByAudience: allAudiences({
      baseMonthlyFrom: 3,
      paMonthlySurcharge: 3,
      label: "Le module de plateforme agréée est affiché à 3 € HT par dossier et par mois.",
      caveat: "Aucun plafond public ni durée d'engagement n'est indiqué sur la page consultée. Le montant contractuel reste à contrôler.",
      sourceIds: ["septeo-pa-2026"],
    }),
    afterActivationActions: [testReceipt("Septeo Ingeneo")],
  },
  {
    id: "cegid",
    aliases: ["Cegid", "Plateforme Agréée Cegid", "Cegid PA"],
    platformSlug: "cegid",
    toolLabel: "Cegid",
    toolDetail: "L'édition Cegid ou EBP utilisée doit être identifiée avant de conclure sur son raccordement.",
    checkedAt: "2026-08-25",
    toolSourceIds: ["cegid-pa-2026", "cegid-supervision-2026"],
    contextSourceIds: [],
    activation: {
      label: "Suivi du dossier",
      question: "La console Cegid indique-t-elle cette entreprise comme rattachée et prête dans votre édition actuelle ?",
      yesValue: "Prête d'après votre réponse",
      noValue: "Rattachement à terminer",
      unknownValue: "À vérifier dans la console",
      yesDetail: "Cette information vient de votre réponse et doit correspondre à la bonne entreprise ainsi qu'à la bonne édition du logiciel.",
      todoDetail: "Cegid publie une console de supervision, mais pas un parcours d'activation identique pour toutes ses éditions.",
      sourceIds: ["cegid-pa-2026", "cegid-supervision-2026"],
      openAction: { title: "Ouvrez la console de supervision", detail: "Recherchez l'entreprise et son état d'avancement dans l'environnement Cegid ou EBP utilisé.", sourceIds: ["cegid-supervision-2026"] },
      activateAction: { title: "Faites confirmer votre édition", detail: "Demandez à votre cabinet ou à Cegid quelle activation est nécessaire pour ce produit et ce contrat.", sourceIds: ["cegid-pa-2026"] },
      checkAction: { title: "Contrôlez le bon dossier", detail: "Vérifiez le rattachement, l'édition et l'entreprise avant de considérer le parcours terminé.", sourceIds: ["cegid-supervision-2026"] },
    },
    costByAudience: allAudiences(quoteCost(
      "Cegid ne publie pas de minimum mensuel exploitable pour ce parcours.",
      "Demandez un devis qui sépare la licence existante, la plateforme agréée, les volumes, l'accompagnement et la sortie.",
      ["cegid-pa-2026"],
    )),
    afterActivationActions: [testReceipt("Cegid")],
  },
  {
    id: "myunisoft",
    aliases: ["MyUnisoft", "MyU", "MY UNISOFT"],
    platformSlug: "myunisoft",
    toolLabel: "MyUnisoft",
    toolDetail: "Suite de production comptable et de gestion utilisée par les cabinets et leurs clients.",
    checkedAt: "2026-08-25",
    toolSourceIds: ["myunisoft-home-2026"],
    contextSourceIds: [],
    activation: {
      label: "Mandat",
      question: "Votre cabinet ou votre espace MyU indique-t-il que le mandat de cette entreprise est validé ?",
      yesValue: "Validé d'après votre réponse",
      noValue: "À valider",
      unknownValue: "À vérifier avec le cabinet",
      yesDetail: "Cette information vient de votre réponse. Le cabinet garde la gestion des mandats depuis son logiciel de production.",
      todoDetail: "MyUnisoft indique que les cabinets gèrent les mandats depuis leur logiciel de production, sans publier les écrans détaillés.",
      sourceIds: ["myunisoft-home-2026"],
      openAction: { title: "Contactez votre cabinet ou ouvrez MyU", detail: "Demandez le statut du mandat pour l'entreprise concernée.", sourceIds: ["myunisoft-home-2026"] },
      activateAction: { title: "Faites valider le mandat", detail: "Identifiez la personne habilitée et terminez le rattachement proposé par le cabinet.", sourceIds: ["myunisoft-home-2026"] },
      checkAction: { title: "Contrôlez émission et réception", detail: "Vérifiez avec le cabinet que l'entreprise pourra émettre et recevoir dans son espace MyU.", sourceIds: ["myunisoft-home-2026"] },
    },
    costByAudience: allAudiences(quoteCost(
      "Aucune grille tarifaire publique exploitable n'a été trouvée pour MyUnisoft.",
      "Demandez au cabinet ou à MyUnisoft le prix par dossier, les volumes inclus, l'engagement et les conditions de sortie.",
      ["myunisoft-home-2026"],
    )),
    afterActivationActions: [testReceipt("MyUnisoft")],
  },
  {
    id: "sap",
    aliases: ["SAP", "SAP Plateforme Agréée", "SAP PA"],
    platformSlug: "sap",
    toolLabel: "SAP",
    toolDetail: "Le raccordement dépend de l'environnement SAP, des interfaces et du projet de déploiement retenu.",
    checkedAt: "2026-08-25",
    toolSourceIds: ["sap-pa-2026"],
    contextSourceIds: [],
    activation: {
      label: "Mise en production",
      question: "L'équipe projet a-t-elle confirmé la mise en production de la PA pour cette entité SAP ?",
      yesValue: "Confirmée d'après votre réponse",
      noValue: "Projet à finaliser",
      unknownValue: "À vérifier avec l'équipe projet",
      yesDetail: "Cette information vient de votre réponse et doit couvrir l'entité, l'environnement et les flux réellement utilisés.",
      todoDetail: "SAP documente sa plateforme, mais pas un bouton d'activation unique pour tous les environnements clients.",
      sourceIds: ["sap-pa-2026"],
      openAction: { title: "Identifiez l'environnement concerné", detail: "Notez l'entité, la version SAP, les interfaces et l'intégrateur responsable du déploiement.", sourceIds: ["sap-pa-2026"] },
      activateAction: { title: "Obtenez le statut du projet", detail: "Demandez une confirmation écrite du raccordement, des flux couverts et de la date de mise en production.", sourceIds: ["sap-pa-2026"] },
      checkAction: { title: "Validez un flux de bout en bout", detail: "Contrôlez avec l'équipe projet une émission, une réception et le traitement du statut associé.", sourceIds: ["sap-pa-2026"] },
    },
    costByAudience: allAudiences(quoteCost(
      "SAP ne publie pas de grille tarifaire PA permettant de calculer un minimum fiable.",
      "Le devis doit isoler les licences, l'intégration, les volumes, l'exploitation et la réversibilité.",
      ["sap-pa-2026"],
    )),
    afterActivationActions: [testReceipt("SAP")],
  },
  {
    id: "generix",
    aliases: ["Generix", "GENERIX Group", "Generix Invoice Services"],
    platformSlug: "generix",
    toolLabel: "Generix",
    toolDetail: "Plateforme de flux EDI, API et ERP destinée aux organisations à volumétrie élevée.",
    checkedAt: "2026-08-25",
    toolSourceIds: ["generix-pa-2026"],
    contextSourceIds: ["generix-readiness-2026", "generix-onboarding-2026"],
    activation: {
      label: "Onboarding",
      question: "Generix ou votre intégrateur a-t-il validé les tests et la mise en production de cette entité ?",
      yesValue: "Validés d'après votre réponse",
      noValue: "Onboarding à terminer",
      unknownValue: "À vérifier avec l'équipe projet",
      yesDetail: "Cette information vient de votre réponse et doit correspondre aux ERP, flux et entités réellement raccordés.",
      todoDetail: "Generix décrit un onboarding et recommande de connecter puis tester les flux ERP ou EDI avant l'échéance.",
      sourceIds: ["generix-readiness-2026", "generix-onboarding-2026"],
      openAction: { title: "Cartographiez les flux concernés", detail: "Listez les ERP, EDI, API, entités et partenaires qui doivent passer par Generix.", sourceIds: ["generix-readiness-2026"] },
      activateAction: { title: "Terminez l'onboarding", detail: "Faites valider le raccordement et les tests prévus avec Generix ou votre intégrateur.", sourceIds: ["generix-onboarding-2026"] },
      checkAction: { title: "Obtenez le procès-verbal de tests", detail: "Conservez la confirmation des flux testés, des entités couvertes et de la date de production.", sourceIds: ["generix-readiness-2026"] },
    },
    costByAudience: allAudiences(quoteCost(
      "Generix facture sur devis selon le volume, le périmètre et les intégrations.",
      "Aucun minimum public ne permet un calcul fiable. Faites chiffrer les paliers, l'onboarding, les connecteurs et la sortie.",
      ["generix-pa-2026"],
    )),
    afterActivationActions: [testReceipt("Generix")],
  },
  {
    id: "esker",
    aliases: ["Esker", "Esker Plateforme Agréée"],
    platformSlug: "esker",
    toolLabel: "Esker",
    toolDetail: "Plateforme d'automatisation des cycles clients et fournisseurs reliée aux ERP.",
    checkedAt: "2026-08-25",
    toolSourceIds: ["esker-demo-2026", "esker-architecture-2026"],
    contextSourceIds: [],
    activation: {
      label: "Déploiement",
      question: "L'équipe projet Esker a-t-elle confirmé les connecteurs et les flux en production pour cette entité ?",
      yesValue: "Confirmés d'après votre réponse",
      noValue: "Déploiement à terminer",
      unknownValue: "À vérifier avec l'équipe projet",
      yesDetail: "Cette information vient de votre réponse et doit couvrir les ERP et les entités réellement utilisés.",
      todoDetail: "Esker documente l'architecture et les flux couverts, sans publier un parcours d'activation universel.",
      sourceIds: ["esker-demo-2026", "esker-architecture-2026"],
      openAction: { title: "Ouvrez le suivi du projet Esker", detail: "Identifiez les entités, ERP, connecteurs et environnements concernés.", sourceIds: ["esker-demo-2026"] },
      activateAction: { title: "Faites confirmer la production", detail: "Demandez à Esker ou à l'intégrateur quels flux sont raccordés et à quelle date.", sourceIds: ["esker-architecture-2026"] },
      checkAction: { title: "Testez les deux sens", detail: "Validez une réception et une émission réelles avec leurs statuts de traitement.", sourceIds: ["esker-architecture-2026"] },
    },
    costByAudience: allAudiences(quoteCost(
      "Esker ne publie pas de grille PA permettant de calculer un minimum mensuel.",
      "Faites détailler dans le devis les volumes, connecteurs, environnements, services de déploiement et conditions de sortie.",
      ["esker-demo-2026"],
    )),
    afterActivationActions: [testReceipt("Esker")],
  },
  {
    id: "cegedim",
    aliases: ["Cegedim SY business", "SY business", "Cegedim"],
    platformSlug: "cegedim",
    toolLabel: "Cegedim SY business",
    toolDetail: "Plateforme de flux B2B reliée aux systèmes d'information des entreprises.",
    checkedAt: "2026-08-25",
    toolSourceIds: ["cegedim-pa-2026", "cegedim-sy-business-2026"],
    contextSourceIds: ["cegedim-readiness-2026"],
    activation: {
      label: "Routage",
      question: "Cegedim a-t-il confirmé cette entité dans l'annuaire et ses flux prêts à être routés ?",
      yesValue: "Confirmés d'après votre réponse",
      noValue: "Routage à finaliser",
      unknownValue: "À vérifier avec Cegedim",
      yesDetail: "Cette information vient de votre réponse et doit correspondre aux bonnes adresses de facturation et aux bons flux.",
      todoDetail: "Cegedim recommande de contrôler l'inscription dans l'annuaire et le routage avant l'échéance.",
      sourceIds: ["cegedim-sy-business-2026", "cegedim-readiness-2026"],
      openAction: { title: "Contrôlez l'entité dans l'annuaire", detail: "Vérifiez les identifiants et les adresses de réception attendues pour l'entreprise.", sourceIds: ["cegedim-readiness-2026"] },
      activateAction: { title: "Faites valider le routage", detail: "Demandez à votre interlocuteur Cegedim de confirmer les flux, les formats et la date de production.", sourceIds: ["cegedim-sy-business-2026"] },
      checkAction: { title: "Testez sans créer de doublon", detail: "Contrôlez une facture entrante puis sortante et vérifiez qu'aucun second circuit ne traite le même document.", sourceIds: ["cegedim-readiness-2026"] },
    },
    costByAudience: allAudiences(quoteCost(
      "Cegedim ne publie pas de minimum mensuel pour SY business dans les sources consultées.",
      "Le devis doit préciser les volumes, formats, connecteurs, services projet, engagement et réversibilité.",
      ["cegedim-pa-2026", "cegedim-sy-business-2026"],
    )),
    afterActivationActions: [testReceipt("Cegedim SY business")],
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
