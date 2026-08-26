import officialDirectory from "../src/data/official-directory.json" with { type: "json" };
import corpusSelectionData from "../src/data/corpus-selection.json" with { type: "json" };
import sourcesData from "../src/data/sources.json" with { type: "json" };
import { platforms } from "../src/data/platforms.ts";
import { collectJourneySourceIds, journeyProfiles } from "../src/data/journey-profiles.ts";
import { directRoutingOptions, directRoutingSourceIds } from "../src/data/direct-routing-options.ts";
import { PASSPORT_LAB_CHECKED_AT, passportRoutes, passportRouteSourceIds } from "../src/data/passport-routes.ts";
import { lab, qualifiesForLabSeal } from "../src/data/lab.ts";
import { INVOICE_RULESET_CHECKED_AT, invoiceVerifierSourceIds } from "../src/lib/invoice-verifier.ts";
import { analyzeFacturXXml } from "../src/lib/invoice-verifier.ts";
import { labSchema, passportRoutesSchema, platformsSchema, sourcesSchema } from "../src/data/schema.ts";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";

const corpusSelectionSchema = z.object({
  selectedAt: z.iso.date(),
  audience: z.string().min(1),
  method: z.array(z.string().min(1)).min(3),
  selected: z.array(z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    segment: z.enum(["cabinet-et-erp", "tpe-pme", "eti-et-grands-comptes"]),
    reach: z.string().min(1),
    reachSourceIds: z.array(z.string().min(1)).min(1),
    reason: z.string().min(1),
  })).length(25),
  replaced: z.array(z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    reason: z.string().min(1),
  })),
});

const checkedPlatforms = platformsSchema.parse(platforms);
const checkedSources = sourcesSchema.parse(sourcesData);
const checkedSelection = corpusSelectionSchema.parse(corpusSelectionData);
const checkedPassportRoutes = passportRoutesSchema.parse(passportRoutes);
const checkedLab = labSchema.parse(lab);
const sourceIds = new Set(checkedSources.map((source) => source.id));
if (sourceIds.size !== checkedSources.length) throw new Error("Un identifiant de source est dupliqué");
const sourcesById = new Map(checkedSources.map((source) => [source.id, source]));
const slugs = new Set<string>();
const approvedByName = new Map(officialDirectory.approved.map((entry) => [entry.name, entry]));
const referencedSourceIds = new Set(["aife-calendar-2026"]);
const coreFields = ["sendsInvoices", "receivesInvoices", "eReporting"] as const;

for (const sourceId of invoiceVerifierSourceIds) {
  const source = sourcesById.get(sourceId);
  if (!source) throw new Error(`Source du vérificateur de facture inconnue : ${sourceId}`);
  if (source.accessedAt > INVOICE_RULESET_CHECKED_AT) {
    throw new Error(`La source ${sourceId} est postérieure aux règles du vérificateur de facture`);
  }
  referencedSourceIds.add(sourceId);
}

for (const option of directRoutingOptions) {
  if (!approvedByName.has(option.officialName)) {
    throw new Error(`${option.name} est absent de la liste DGFiP approuvée`);
  }
}
for (const sourceId of directRoutingSourceIds) {
  if (!sourceIds.has(sourceId)) throw new Error(`Source du routage direct inconnue : ${sourceId}`);
  referencedSourceIds.add(sourceId);
}

const passportSlugs = new Set<string>();
for (const route of checkedPassportRoutes) {
  if (passportSlugs.has(route.slug)) throw new Error(`Route Passeport dupliquée : ${route.slug}`);
  passportSlugs.add(route.slug);
  if (!approvedByName.has(route.officialName)) {
    throw new Error(`${route.name} est absent de la liste DGFiP approuvée`);
  }
  if (route.checkedAt !== PASSPORT_LAB_CHECKED_AT) {
    throw new Error(`${route.name} : date de contrôle incohérente avec la version du Lab`);
  }
  const factIds = new Set(route.facts.map((fact) => fact.id));
  if (factIds.size !== route.facts.length) throw new Error(`${route.name} : fait Passeport dupliqué`);
  for (const fact of route.facts) {
    if (fact.state === "not_published" && fact.sourceIds.length !== 0) {
      throw new Error(`${route.name} : une information non publiée ne doit pas citer une source trompeuse`);
    }
    if (fact.state !== "not_published" && fact.sourceIds.length === 0) {
      throw new Error(`${route.name} : une affirmation documentée ou à confirmer doit citer sa source`);
    }
  }
}
for (const sourceId of passportRouteSourceIds) {
  const source = sourcesById.get(sourceId);
  if (!source) throw new Error(`Source du Passeport inconnue : ${sourceId}`);
  if (source.accessedAt > PASSPORT_LAB_CHECKED_AT) {
    throw new Error(`La source Passeport ${sourceId} est postérieure à la version du Lab`);
  }
  referencedSourceIds.add(sourceId);
}

const expectedLabCaseIds = ["service-simple", "multi-tva", "avoir"];
const expectedLabStepIds = ["import", "lecture", "integrite", "emission", "statut"];
const expectedLabPlatformSlugs = ["qonto", "pennylane", "b2brouter"];
if (checkedLab.cases.map(({ id }) => id).join(",") !== expectedLabCaseIds.join(",")) {
  throw new Error("Le kit Lab doit conserver ses trois cas dans l’ordre public annoncé");
}
if (checkedLab.protocol.map(({ id }) => id).join(",") !== expectedLabStepIds.join(",")) {
  throw new Error("Le protocole Lab doit conserver ses cinq étapes dans l’ordre public annoncé");
}
if (checkedLab.platforms.map(({ slug }) => slug).join(",") !== expectedLabPlatformSlugs.join(",")) {
  throw new Error("La première matrice Lab doit couvrir Qonto, Pennylane et B2Brouter");
}

for (const sourceId of checkedLab.sourceIds) {
  const source = sourcesById.get(sourceId);
  if (!source) throw new Error(`Source de méthode Lab inconnue : ${sourceId}`);
  if (source.accessedAt > checkedLab.checkedAt) throw new Error(`Source Lab postérieure au contrôle : ${sourceId}`);
  referencedSourceIds.add(sourceId);
}

for (const testCase of checkedLab.cases) {
  const fixtureUrl = new URL(`../public${testCase.fileHref}`, import.meta.url);
  const fixture = readFileSync(fixtureUrl);
  const digest = createHash("sha256").update(fixture).digest("hex");
  if (digest !== testCase.sha256) throw new Error(`${testCase.title} : empreinte SHA-256 incohérente`);
  if (fixture.byteLength !== testCase.bytes) throw new Error(`${testCase.title} : taille de fichier incohérente`);
  const xml = fixture.toString("utf8");
  if (!xml.includes(`<ram:TypeCode>${testCase.documentTypeCode}</ram:TypeCode>`)) {
    throw new Error(`${testCase.title} : type de document inattendu`);
  }
  const analysis = analyzeFacturXXml(xml);
  if (analysis.status !== "usable") throw new Error(`${testCase.title} : le prévol PA Check doit être exploitable`);
  if (analysis.metadata.invoiceNumber !== testCase.expected.invoiceNumber
    || analysis.metadata.lineCount !== testCase.expected.lineCount
    || analysis.metadata.grandTotal !== testCase.expected.grandTotal
    || analysis.metadata.currency !== testCase.expected.currency) {
    throw new Error(`${testCase.title} : résultat de prévol différent du contrat public`);
  }
  const facturXFields = [testCase.facturXHref, testCase.facturXSha256, testCase.facturXBytes, testCase.facturXValidation];
  if (facturXFields.some((value) => value !== undefined) && facturXFields.some((value) => value === undefined)) {
    throw new Error(`${testCase.title} : le fichier Factur-X et ses contrôles doivent être déclarés ensemble`);
  }
  if (testCase.facturXHref && testCase.facturXSha256 && testCase.facturXBytes) {
    const facturX = readFileSync(new URL(`../public${testCase.facturXHref}`, import.meta.url));
    if (facturX.byteLength !== testCase.facturXBytes
      || createHash("sha256").update(facturX).digest("hex") !== testCase.facturXSha256) {
      throw new Error(`${testCase.title} : le PDF Factur-X ne correspond plus à la version publiée`);
    }
    const pdfStructure = facturX.toString("latin1");
    if (!pdfStructure.startsWith("%PDF-1.7")
      || !pdfStructure.includes('pdfaid:part="3"')
      || !pdfStructure.includes("/AFRelationship /Alternative")
      || !pdfStructure.includes("factur-x.xml")) {
      throw new Error(`${testCase.title} : structure PDF/A-3 Factur-X incomplète`);
    }
  }
}

for (const platform of checkedLab.platforms) {
  if (!approvedByName.has(platform.officialName)) {
    throw new Error(`${platform.name} est absent de la liste DGFiP approuvée`);
  }
  for (const sourceId of platform.sourceIds) {
    const source = sourcesById.get(sourceId);
    if (!source) throw new Error(`Source Lab inconnue ${sourceId} pour ${platform.name}`);
    if (source.accessedAt > checkedLab.checkedAt) throw new Error(`${platform.name} : source postérieure au contrôle Lab`);
    referencedSourceIds.add(sourceId);
  }
  if (platform.status === "not_tested") {
    if (platform.evidenceLevel !== "documentation_only" || platform.testedAt !== null || platform.environment !== null || platform.sealAwarded) {
      throw new Error(`${platform.name} : un test non exécuté ne peut afficher ni observation ni sceau`);
    }
    if (!platform.caseResults.every((result) => result.status === "not_tested")
      || !platform.observations.every((observation) => observation.status === "not_tested" && observation.evidenceIds.length === 0)) {
      throw new Error(`${platform.name} : les cellules non testées doivent rester vides de preuves observées`);
    }
  }
  if (platform.sealAwarded && !qualifiesForLabSeal(platform)) {
    throw new Error(`${platform.name} : sceau interdit sans parcours complet observé`);
  }
}

for (const platform of checkedPlatforms) {
  if (slugs.has(platform.slug)) throw new Error(`Slug dupliqué : ${platform.slug}`);
  slugs.add(platform.slug);
  const officialEntry = approvedByName.get(platform.officialName);
  if (!officialEntry) {
    throw new Error(`${platform.displayName} absent de la liste DGFiP approuvée : ${platform.officialName}`);
  }
  if (platform.officialStatus.status !== "official" || platform.officialStatus.sourceIds.length === 0) {
    throw new Error(`${platform.displayName} : le statut PA doit être relié à une preuve officielle`);
  }
  if (!platform.officialStatus.sourceIds.includes("dgfip-list-2026-08-19")) {
    throw new Error(`${platform.displayName} : la preuve du statut PA doit inclure la liste DGFiP`);
  }
  if (platform.registeredAt.status !== "official" || !platform.registeredAt.sourceIds.includes("dgfip-list-2026-08-19")) {
    throw new Error(`${platform.displayName} : la date d'immatriculation doit provenir de la liste DGFiP`);
  }
  if (platform.registeredAt.value !== officialEntry.registeredAt) {
    throw new Error(`${platform.displayName} : date d'immatriculation incohérente avec la liste DGFiP`);
  }

  for (const fieldName of coreFields) {
    const evidence = platform[fieldName];
    if (evidence.value === true && !((evidence.status === "official" || evidence.status === "documented") && evidence.sourceIds.length > 0)) {
      throw new Error(`${platform.displayName} : ${fieldName} ne peut pas être positif sans preuve forte`);
    }
  }

  for (const field of Object.values(platform)) {
    if (!field || typeof field !== "object" || !("sourceIds" in field)) continue;
    const evidence = field as { value: unknown; status: string; sourceIds: string[]; checkedAt: string };
    if (evidence.value === null && (evidence.status !== "non_documented" || evidence.sourceIds.length !== 0)) {
      throw new Error(`${platform.displayName} : une inconnue doit rester non documentée et sans source trompeuse`);
    }
    if (evidence.value !== null && evidence.status === "non_documented") {
      throw new Error(`${platform.displayName} : une valeur ne peut pas être marquée non documentée`);
    }
    for (const sourceId of field.sourceIds as string[]) {
      if (!sourceIds.has(sourceId)) throw new Error(`Source inconnue ${sourceId} dans ${platform.slug}`);
      referencedSourceIds.add(sourceId);
      const source = sourcesById.get(sourceId);
      if (source && source.accessedAt > evidence.checkedAt) {
        throw new Error(`${platform.displayName} : ${sourceId} a été consultée après la date de contrôle de la preuve`);
      }
    }
  }
}

const selectedSlugs = new Set<string>();
for (const selected of checkedSelection.selected) {
  if (selectedSlugs.has(selected.slug)) throw new Error(`Sélection dupliquée : ${selected.slug}`);
  selectedSlugs.add(selected.slug);
  if (!slugs.has(selected.slug)) throw new Error(`La sélection référence une fiche absente : ${selected.slug}`);
  for (const sourceId of selected.reachSourceIds) {
    if (!sourceIds.has(sourceId)) throw new Error(`Source de portée inconnue ${sourceId} pour ${selected.slug}`);
    referencedSourceIds.add(sourceId);
  }
}
for (const slug of slugs) {
  if (!selectedSlugs.has(slug)) throw new Error(`La fiche ${slug} est absente de la méthode de sélection`);
}

for (const route of checkedPassportRoutes) {
  if (route.profileHref !== null && !slugs.has(route.slug)) {
    throw new Error(`${route.name} : la fiche liée n'existe pas dans le corpus`);
  }
}

const journeyIds = new Set<string>();
const journeyAliases = new Set<string>();
const journeySlugs = new Set<string>();
for (const profile of journeyProfiles) {
  if (journeyIds.has(profile.id)) throw new Error(`Parcours dupliqué : ${profile.id}`);
  journeyIds.add(profile.id);
  if (!slugs.has(profile.platformSlug)) throw new Error(`Le parcours ${profile.id} référence une fiche absente : ${profile.platformSlug}`);
  if (journeySlugs.has(profile.platformSlug)) throw new Error(`Plusieurs parcours couvrent la même fiche : ${profile.platformSlug}`);
  journeySlugs.add(profile.platformSlug);
  for (const alias of profile.aliases) {
    const normalizedAlias = alias.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").replace(/[^a-z0-9]+/g, " ").trim();
    if (journeyAliases.has(normalizedAlias)) throw new Error(`Alias de parcours dupliqué : ${alias}`);
    journeyAliases.add(normalizedAlias);
  }
  for (const [audience, cost] of Object.entries(profile.costByAudience)) {
    if (cost.baseMonthlyFrom !== null && cost.baseMonthlyFrom < 0) throw new Error(`${profile.id} : coût négatif pour ${audience}`);
    if (cost.paMonthlySurcharge !== null && cost.paMonthlySurcharge < 0) throw new Error(`${profile.id} : surcoût PA négatif pour ${audience}`);
  }
  for (const sourceId of collectJourneySourceIds(profile)) {
    if (!sourceIds.has(sourceId)) throw new Error(`Source de parcours inconnue ${sourceId} pour ${profile.id}`);
    referencedSourceIds.add(sourceId);
    const source = sourcesById.get(sourceId);
    if (source && source.accessedAt > profile.checkedAt) {
      throw new Error(`${profile.id} : ${sourceId} a été consultée après la date de contrôle du parcours`);
    }
  }
}
if (journeySlugs.size !== checkedPlatforms.length) {
  throw new Error(`Chaque fiche doit avoir un parcours détaillé : ${journeySlugs.size}/${checkedPlatforms.length}`);
}

for (const source of checkedSources) {
  if (!referencedSourceIds.has(source.id)) throw new Error(`Source orpheline non liée au corpus : ${source.id}`);
}

if (officialDirectory.approved.length !== 148) {
  throw new Error(`La liste approuvée doit contenir 148 opérateurs, reçu ${officialDirectory.approved.length}`);
}
if (officialDirectory.pending.length !== 18) {
  throw new Error(`La liste en attente doit contenir 18 opérateurs, reçu ${officialDirectory.pending.length}`);
}

console.log(`Données valides : ${checkedPlatforms.length} fiches sélectionnées, ${checkedSources.length} sources liées, ${checkedPassportRoutes.length} routes Passeport, ${checkedLab.cases.length} cas Lab sur ${checkedLab.platforms.length} PA, ${officialDirectory.approved.length} PA approuvées, ${officialDirectory.pending.length} en attente.`);
