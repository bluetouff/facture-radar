export const lab = {
  version: "1.2.0",
  checkedAt: "2026-08-26",
  sourceIds: ["dgfip-specs-v3-2-2026", "fnfe-facturx-1-09-2-2026"],
  cases: [
    {
      id: "service-simple",
      title: "Prestation simple",
      purpose: "Une prestation, un taux de TVA et un total. Le cas le plus courant pour une petite entreprise.",
      fileHref: "/lab/fixtures/service-simple-en16931-v2.xml",
      fileVersion: "2.0.0",
      sha256: "3c83d96f91e4cbae8fa54683ad603e0f04bcc009cc6afb7bc644d9904bca8d21",
      bytes: 6565,
      facturXHref: "/lab/fixtures/service-simple-facturx-en16931-v2.pdf",
      facturXSha256: "3f35414b5f8ce5f082a51c42b76c5ca38f93aa4aee8bd4d0fc55de4c38cae7b8",
      facturXBytes: 79965,
      facturXValidation: "passed",
      documentTypeCode: "380",
      expected: { invoiceNumber: "LAB-FX-EN16931-001", lineCount: 1, vatRates: [20], grandTotal: 120, currency: "EUR" },
      preflightStatus: "passed",
      limitations: ["Document Factur-X entièrement synthétique, réservé aux espaces de test.", "Identifiants volontairement fictifs et impropres à la production."],
    },
    {
      id: "multi-tva",
      title: "Deux taux de TVA",
      purpose: "Deux taux de TVA sur la même facture, pour repérer les erreurs de ventilation et de total.",
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
      purpose: "Un remboursement à reconnaître comme un avoir, sans le confondre avec une nouvelle facture.",
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
      summary: "Nous n’avons pas encore pu essayer ces trois factures dans Qonto.",
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
      nextAction: "Obtenir un compte de démonstration puis essayer les trois fichiers.",
    },
    {
      slug: "pennylane",
      name: "Pennylane",
      officialName: "PENNYLANE",
      status: "not_tested",
      evidenceLevel: "documentation_only",
      summary: "Nous n’avons pas encore pu essayer ces trois factures dans Pennylane.",
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
      nextAction: "Obtenir un espace de test puis vérifier l’import et l’envoi des trois fichiers.",
    },
    {
      slug: "b2brouter",
      name: "B2Brouter",
      officialName: "B2BRouter",
      status: "not_tested",
      evidenceLevel: "documentation_only",
      summary: "B2Brouter propose un espace de test isolé. Nous préparons le premier essai avec nos trois factures.",
      sourceIds: ["b2brouter-sandbox-2026", "b2brouter-api-import-2026"],
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
      nextAction: "Importer les trois fichiers dans l’espace de test, puis vérifier leur lecture avant tout essai d’envoi.",
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
