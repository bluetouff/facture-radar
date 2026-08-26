export const lab = {
  version: "1.0.0",
  checkedAt: "2026-08-25",
  sourceIds: ["dgfip-specs-v3-2-2026", "fnfe-facturx-1-09-2-2026"],
  cases: [
    {
      id: "service-simple",
      title: "Prestation simple",
      purpose: "Vérifier le parcours le plus courant avec une ligne, un taux de TVA et un total immédiatement contrôlable.",
      fileHref: "/lab/fixtures/service-simple-cii-v1.xml",
      fileVersion: "1.0.0",
      sha256: "b2b51be080a1d7d19ba929f098360dd074a42b2063ffb4c5d802c34fb3eeb2f2",
      bytes: 3330,
      documentTypeCode: "380",
      expected: { invoiceNumber: "LAB-SERVICE-001", lineCount: 1, vatRates: [20], grandTotal: 120, currency: "EUR" },
      preflightStatus: "passed",
      limitations: ["Document XML synthétique de prévol, sans signature ni pièce jointe PDF.", "Identifiants volontairement fictifs et impropres à la production."],
    },
    {
      id: "multi-tva",
      title: "Deux taux de TVA",
      purpose: "Observer si la plateforme conserve deux ventilations de TVA et restitue des totaux identiques après l’import.",
      fileHref: "/lab/fixtures/multi-tva-cii-v1.xml",
      fileVersion: "1.0.0",
      sha256: "0f469e4aa818f45b026355143e9ca11b28890dbb6502af51042087044bc10fa2",
      bytes: 3886,
      documentTypeCode: "380",
      expected: { invoiceNumber: "LAB-MULTI-TVA-001", lineCount: 2, vatRates: [20, 10], grandTotal: 175, currency: "EUR" },
      preflightStatus: "passed",
      limitations: ["Document XML synthétique de prévol, sans signature ni pièce jointe PDF.", "Identifiants volontairement fictifs et impropres à la production."],
    },
    {
      id: "avoir",
      title: "Avoir",
      purpose: "Tester la reconnaissance du type de document 381 et le traitement du circuit d’annulation sans le confondre avec une facture.",
      fileHref: "/lab/fixtures/avoir-cii-v1.xml",
      fileVersion: "1.0.0",
      sha256: "fce274eb68b942a76f6951a877e37b61d3113f45c82fb22a5523da3b78e9c069",
      bytes: 3278,
      documentTypeCode: "381",
      expected: { invoiceNumber: "LAB-AVOIR-001", lineCount: 1, vatRates: [20], grandTotal: 96, currency: "EUR" },
      preflightStatus: "passed",
      limitations: ["Document XML synthétique de prévol, sans signature ni pièce jointe PDF.", "Le prévol PA Check ne remplace pas une validation normative complète de l’avoir."],
    },
  ],
  protocol: [
    { id: "import", number: 1, label: "Import", question: "Le fichier entre-t-il sans ressaisie ni conversion manuelle ?", successDefinition: "Le fichier original est accepté dans un environnement de test et rattaché au bon type de document." },
    { id: "lecture", number: 2, label: "Lecture", question: "Les lignes, taux, montants et parties sont-ils lus correctement ?", successDefinition: "Les valeurs affichées correspondent exactement aux résultats attendus publiés avec le cas." },
    { id: "integrite", number: 3, label: "Intégrité", question: "Le XML d’origine reste-t-il disponible et inchangé ?", successDefinition: "Le fichier peut être récupéré avec le même SHA-256 ou une transformation est explicitement signalée." },
    { id: "emission", number: 4, label: "Émission", question: "La plateforme peut-elle transmettre ce document dans son circuit PA ?", successDefinition: "Une émission de test atteint l’étape de routage sans recréer la facture dans un autre outil." },
    { id: "statut", number: 5, label: "Statut", question: "Le suivi du cycle de vie revient-il dans l’interface ?", successDefinition: "Un statut horodaté et intelligible est visible pour le document émis dans le test." },
  ],
  platforms: [
    {
      slug: "qonto",
      name: "Qonto",
      officialName: "QONTO",
      status: "not_tested",
      evidenceLevel: "documentation_only",
      summary: "L’import et le circuit sont documentés. Le protocole PA Check n’a pas encore été exécuté dans un environnement de test Qonto.",
      sourceIds: ["qonto-import-electronic-2026", "qonto-flow-2026"],
      testedAt: null,
      environment: null,
      caseResults: [
        { caseId: "service-simple", status: "not_tested", note: "À exécuter dans un compte de test." },
        { caseId: "multi-tva", status: "not_tested", note: "À exécuter dans un compte de test." },
        { caseId: "avoir", status: "not_tested", note: "À exécuter dans un compte de test." },
      ],
      observations: [
        { stepId: "import", status: "not_tested", evidenceIds: [] },
        { stepId: "lecture", status: "not_tested", evidenceIds: [] },
        { stepId: "integrite", status: "not_tested", evidenceIds: [] },
        { stepId: "emission", status: "not_tested", evidenceIds: [] },
        { stepId: "statut", status: "not_tested", evidenceIds: [] },
      ],
      sealAwarded: false,
      nextAction: "Obtenir un accès de test, exécuter les trois cas et conserver les preuves techniques de chaque étape.",
    },
    {
      slug: "pennylane",
      name: "Pennylane",
      officialName: "PENNYLANE",
      status: "not_tested",
      evidenceLevel: "documentation_only",
      summary: "Les formats et l’import Factur-X sont documentés. Le protocole PA Check n’a pas encore été observé de bout en bout.",
      sourceIds: ["pennylane-formats-2026", "pennylane-import-facturx-2026"],
      testedAt: null,
      environment: null,
      caseResults: [
        { caseId: "service-simple", status: "not_tested", note: "À exécuter dans un compte de test." },
        { caseId: "multi-tva", status: "not_tested", note: "À exécuter dans un compte de test." },
        { caseId: "avoir", status: "not_tested", note: "À exécuter dans un compte de test." },
      ],
      observations: [
        { stepId: "import", status: "not_tested", evidenceIds: [] },
        { stepId: "lecture", status: "not_tested", evidenceIds: [] },
        { stepId: "integrite", status: "not_tested", evidenceIds: [] },
        { stepId: "emission", status: "not_tested", evidenceIds: [] },
        { stepId: "statut", status: "not_tested", evidenceIds: [] },
      ],
      sealAwarded: false,
      nextAction: "Obtenir un espace de test, importer chaque fichier puis comparer les données et le XML restitué.",
    },
    {
      slug: "b2brouter",
      name: "B2Brouter",
      officialName: "B2BRouter",
      status: "not_tested",
      evidenceLevel: "documentation_only",
      summary: "Le portail, l’API France et plusieurs formats d’entrée sont documentés. Leur enchaînement complet reste à tester par PA Check.",
      sourceIds: ["b2brouter-free-2026", "b2brouter-france-api-2026"],
      testedAt: null,
      environment: null,
      caseResults: [
        { caseId: "service-simple", status: "not_tested", note: "À exécuter dans un compte de test." },
        { caseId: "multi-tva", status: "not_tested", note: "À exécuter dans un compte de test." },
        { caseId: "avoir", status: "not_tested", note: "À exécuter dans un compte de test." },
      ],
      observations: [
        { stepId: "import", status: "not_tested", evidenceIds: [] },
        { stepId: "lecture", status: "not_tested", evidenceIds: [] },
        { stepId: "integrite", status: "not_tested", evidenceIds: [] },
        { stepId: "emission", status: "not_tested", evidenceIds: [] },
        { stepId: "statut", status: "not_tested", evidenceIds: [] },
      ],
      sealAwarded: false,
      nextAction: "Exécuter les trois cas sur le portail et l’API de test, puis rapprocher les deux chemins.",
    },
  ],
} as const;

type LabResultStatus = "tested" | "failed" | "partial" | "not_tested";

export interface LabSealCandidate {
  evidenceLevel: "observed" | "documentation_only";
  status: LabResultStatus;
  testedAt: string | null;
  environment: string | null;
  caseResults: readonly { status: LabResultStatus }[];
  observations: readonly { status: LabResultStatus; evidenceIds: readonly string[] }[];
}

export function qualifiesForLabSeal(platform: LabSealCandidate): boolean {
  return platform.evidenceLevel === "observed"
    && platform.status === "tested"
    && platform.testedAt !== null
    && platform.environment !== null
    && platform.caseResults.every((result) => result.status === "tested")
    && platform.observations.every((observation) => observation.status === "tested" && observation.evidenceIds.length > 0);
}
