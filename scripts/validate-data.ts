import officialDirectory from "../src/data/official-directory.json" with { type: "json" };
import sourcesData from "../src/data/sources.json" with { type: "json" };
import { platforms } from "../src/data/platforms.ts";
import { platformsSchema, sourcesSchema } from "../src/data/schema.ts";

const checkedPlatforms = platformsSchema.parse(platforms);
const checkedSources = sourcesSchema.parse(sourcesData);
const sourceIds = new Set(checkedSources.map((source) => source.id));
const slugs = new Set<string>();
const approvedNames = new Set(officialDirectory.approved.map((entry) => entry.name));

for (const platform of checkedPlatforms) {
  if (slugs.has(platform.slug)) throw new Error(`Slug dupliqué : ${platform.slug}`);
  slugs.add(platform.slug);
  if (!approvedNames.has(platform.officialName)) {
    throw new Error(`${platform.displayName} absent de la liste DGFiP approuvée : ${platform.officialName}`);
  }
  for (const field of Object.values(platform)) {
    if (!field || typeof field !== "object" || !("sourceIds" in field)) continue;
    for (const sourceId of field.sourceIds as string[]) {
      if (!sourceIds.has(sourceId)) throw new Error(`Source inconnue ${sourceId} dans ${platform.slug}`);
    }
  }
}

if (officialDirectory.approved.length !== 148) {
  throw new Error(`La liste approuvée doit contenir 148 opérateurs, reçu ${officialDirectory.approved.length}`);
}
if (officialDirectory.pending.length !== 18) {
  throw new Error(`La liste en attente doit contenir 18 opérateurs, reçu ${officialDirectory.pending.length}`);
}

console.log(`Données valides : ${checkedPlatforms.length} fiches, ${checkedSources.length} sources, ${officialDirectory.approved.length} PA approuvées, ${officialDirectory.pending.length} en attente.`);
