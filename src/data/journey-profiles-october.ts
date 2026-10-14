import type { JourneyProfileDefinition } from "./journey-profiles.ts";
import { journey, quote } from "./journey-profiles-expanded.ts";

const checkedAt = "2026-10-14";
const officialSource = "dgfip-list-20261014";

const activationToConfirm = (name: string, sourceIds: readonly string[]) => ({
  question: `Avez-vous obtenu la confirmation du rattachement de votre entreprise à ${name} comme plateforme agréée ?`,
  todo: "Le parcours public de rattachement reste à confirmer. Demandez la procédure applicable à votre entreprise, les pièces nécessaires et les conditions d’activation.",
  open: `Contactez ${name} pour obtenir la procédure d’inscription à son offre PA française et le nom exact du service proposé.`,
  activate: "Faites préciser les étapes et les justificatifs requis pour votre SIREN avant de demander le rattachement.",
  check: "Obtenez une confirmation du statut de votre SIREN dans l’annuaire et de l’adresse de réception enregistrée. Les fonctions activées doivent être précisées séparément.",
  sourceIds,
});

export const octoberJourneyProfiles: readonly JourneyProfileDefinition[] = [
  journey({
    id: "befresh",
    platformSlug: "befresh",
    aliases: ["BeFresh", "BeInvoice", "BeInvoice by BeFresh"],
    toolLabel: "BeInvoice by BeFresh",
    toolDetail: "Service Peppol et API REST JSON annoncés par BeFresh. Le périmètre de l’offre PA française reste à confirmer.",
    checkedAt,
    sourceIds: [officialSource, "befresh-pa-20261014"],
    activation: activationToConfirm("BeFresh", [officialSource, "befresh-pa-20261014"]),
    cost: quote(["befresh-pa-20261014"], "Demandez un devis pour l’offre PA française : émission, réception, e-reporting, volumes, intégration à l’API et restitution des données."),
    after: [{
      title: "Confirmez les échanges français",
      detail: "La documentation décrit Peppol et une API JSON. Faites confirmer les fonctions PA françaises, les formats acceptés et les conditions de production pour votre entreprise.",
      sourceIds: ["befresh-pa-20261014"],
    }],
  }),
  journey({
    id: "factureapp",
    platformSlug: "factureapp",
    aliases: ["FacturesApp", "FactureApp", "factureapp.com"],
    toolLabel: "FacturesApp",
    toolDetail: "Plan de réception électronique annoncé. Les plans d’émission et le périmètre de l’e-reporting restent à confirmer.",
    checkedAt,
    sourceIds: [officialSource, "factureapp-pa-20261014"],
    activation: activationToConfirm("FacturesApp", [officialSource, "factureapp-pa-20261014"]),
    cost: {
      baseMonthlyFrom: null,
      paMonthlySurcharge: null,
      label: "Réception : 1 € HT/mois, facturé 12 € HT/an. Émission à chiffrer.",
      caveat: "Ce prix couvre le plan Réception et son volume illimité. Les conditions détaillées, le coût de l’émission et celui de l’e-reporting restent à obtenir ; aucun coût total du parcours n’est calculé.",
      sourceIds: ["factureapp-pa-20261014"],
    },
    after: [{
      title: "Faites préciser votre plan",
      detail: "Vérifiez les conditions de réception et l’offre nécessaire pour émettre. Demandez également le périmètre de l’e-reporting et des accès de votre cabinet comptable.",
      sourceIds: ["factureapp-pa-20261014"],
    }],
  }),
  journey({
    id: "insiders-technologies",
    platformSlug: "insiders-technologies",
    aliases: ["Insiders Technologies", "Insiders Technologies GmbH"],
    toolLabel: "Insiders Technologies",
    toolDetail: "Solutions e-connect et e-convert pour les échanges et la conversion de factures. Leur périmètre PA français reste à préciser.",
    checkedAt,
    sourceIds: [officialSource, "insiders-einvoicing-20261014"],
    activation: activationToConfirm("Insiders Technologies", [officialSource, "insiders-einvoicing-20261014"]),
    cost: quote(["insiders-einvoicing-20261014"], "Demandez une offre chiffrée pour la PA française, en distinguant conversion, raccordements, volumes, accompagnement et restitution."),
    after: [{
      title: "Rattachez les modules à votre besoin",
      detail: "La page e-invoicing présente e-connect, e-convert et des intégrations, notamment SAP et Chorus Pro. Faites confirmer les modules nécessaires et les fonctions PA françaises réellement activables dans votre contrat.",
      sourceIds: ["insiders-einvoicing-20261014"],
    }],
  }),
  journey({
    id: "kalanda",
    platformSlug: "kalanda",
    aliases: ["Kalanda"],
    toolLabel: "Kalanda",
    toolDetail: "Hébergeur présent dans la liste officielle des PA. Son offre de facturation électronique reste à documenter.",
    checkedAt,
    sourceIds: [officialSource, "kalanda-pa-20261014"],
    activation: activationToConfirm("Kalanda", [officialSource, "kalanda-pa-20261014"]),
    cost: quote(["kalanda-pa-20261014"], "Les prix publics d’hébergement concernent d’autres services. Demandez le prix de la PA, ses fonctions, ses volumes et les frais de raccordement."),
    after: [{
      title: "Obtenez la fiche de l’offre PA",
      detail: "Demandez les fonctions disponibles, les conditions de production et le périmètre d’hébergement et de certification applicable à la PA. Le site présente principalement des services cloud et d’infrastructure.",
      sourceIds: [officialSource, "kalanda-pa-20261014"],
    }],
  }),
  journey({
    id: "my-eddy",
    platformSlug: "my-eddy",
    aliases: ["MY-EDDY"],
    toolLabel: "MY-EDDY",
    toolDetail: "La DGFiP renvoie vers DailyApps, consacré aux outils RH et aux notes de frais. L’offre PA reste à préciser.",
    checkedAt,
    sourceIds: [officialSource, "my-eddy-pa-20261014"],
    activation: activationToConfirm("MY-EDDY", [officialSource, "my-eddy-pa-20261014"]),
    cost: quote(["my-eddy-pa-20261014"], "Les packs DailyApps sont tarifés pour des applications RH. Demandez une offre PA distincte avec son périmètre, ses volumes et ses conditions commerciales."),
    after: [{
      title: "Identifiez le service de facturation",
      detail: "Faites confirmer le nom de l’offre PA, ses fonctions, ses intégrations et son contrat. Les exports et tarifs des modules RH DailyApps ne suffisent pas à documenter cette offre.",
      sourceIds: [officialSource, "my-eddy-pa-20261014"],
    }],
  }),
  journey({
    id: "ratioo",
    platformSlug: "ratioo",
    aliases: ["Ratioo", "Ratioo PA"],
    toolLabel: "Ratioo",
    toolDetail: "Environnement pour cabinets comptables et clients, avec fonctions PA annoncées. Leur activation pour chaque dossier reste à confirmer.",
    checkedAt,
    sourceIds: [officialSource, "ratioo-pa-offre-20261014", "ratioo-pa-20261014"],
    activation: activationToConfirm("Ratioo", [officialSource, "ratioo-pa-offre-20261014"]),
    cost: {
      ...quote(["ratioo-pricing-20261014"], "Le prix annoncé est calculé sur une base de 200 dossiers. Faites préciser la TVA, le minimum facturé, le volume du cabinet, l’engagement et les conditions d’accès à la PA ; aucune projection par entreprise n’est calculée."),
      label: "Dès 4 €/dossier/mois sur une base de 200 dossiers ; devis à confirmer.",
    },
    after: [{
      title: "Validez le périmètre de chaque dossier",
      detail: "Ratioo annonce émission, réception et e-reporting sur sa page PA. Faites confirmer leur activation, les flux concernés et les droits du cabinet pour chaque entreprise cliente.",
      sourceIds: ["ratioo-pa-offre-20261014"],
    }],
  }),
];
