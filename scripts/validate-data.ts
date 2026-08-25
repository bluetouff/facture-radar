import officialDirectory from "../src/data/official-directory.json" with { type: "json" };
import corpusSelectionData from "../src/data/corpus-selection.json" with { type: "json" };
import sourcesData from "../src/data/sources.json" with { type: "json" };
import { platforms } from "../src/data/platforms.ts";
import { collectJourneySourceIds, journeyProfiles } from "../src/data/journey-profiles.ts";
import { platformsSchema, sourcesSchema } from "../src/data/schema.ts";
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
  })).length(15),
  replaced: z.array(z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    reason: z.string().min(1),
  })),
});

const checkedPlatforms = platformsSchema.parse(platforms);
const checkedSources = sourcesSchema.parse(sourcesData);
const checkedSelection = corpusSelectionSchema.parse(corpusSelectionData);
const sourceIds = new Set(checkedSources.map((source) => source.id));
if (sourceIds.size !== checkedSources.length) throw new Error("Un identifiant de source est dupliqué");
const sourcesById = new Map(checkedSources.map((source) => [source.id, source]));
const slugs = new Set<string>();
const approvedByName = new Map(officialDirectory.approved.map((entry) => [entry.name, entry]));
const referencedSourceIds = new Set(["aife-calendar-2026"]);
const coreFields = ["sendsInvoices", "receivesInvoices", "eReporting"] as const;

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

const journeyIds = new Set<string>();
const journeyAliases = new Set<string>();
for (const profile of journeyProfiles) {
  if (journeyIds.has(profile.id)) throw new Error(`Parcours dupliqué : ${profile.id}`);
  journeyIds.add(profile.id);
  if (!slugs.has(profile.platformSlug)) throw new Error(`Le parcours ${profile.id} référence une fiche absente : ${profile.platformSlug}`);
  for (const alias of profile.aliases) {
    const normalizedAlias = alias.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").replace(/[^a-z0-9]+/g, " ").trim();
    if (journeyAliases.has(normalizedAlias)) throw new Error(`Alias de parcours dupliqué : ${alias}`);
    journeyAliases.add(normalizedAlias);
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

for (const source of checkedSources) {
  if (!referencedSourceIds.has(source.id)) throw new Error(`Source orpheline non liée au corpus : ${source.id}`);
}

if (officialDirectory.approved.length !== 148) {
  throw new Error(`La liste approuvée doit contenir 148 opérateurs, reçu ${officialDirectory.approved.length}`);
}
if (officialDirectory.pending.length !== 18) {
  throw new Error(`La liste en attente doit contenir 18 opérateurs, reçu ${officialDirectory.pending.length}`);
}

console.log(`Données valides : ${checkedPlatforms.length} fiches sélectionnées, ${checkedSources.length} sources liées, ${officialDirectory.approved.length} PA approuvées, ${officialDirectory.pending.length} en attente.`);
