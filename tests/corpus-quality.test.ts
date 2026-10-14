import test from "node:test";
import assert from "node:assert/strict";
import corpusSelection from "../src/data/corpus-selection.json" with { type: "json" };
import sources from "../src/data/sources.json" with { type: "json" };
import officialDirectory from "../src/data/official-directory.json" with { type: "json" };
import { platforms } from "../src/data/platforms.ts";
import { platformSchema } from "../src/data/schema.ts";

test("le corpus contient exactement les 155 acteurs approuvés", () => {
  const platformSlugs = platforms.map((platform) => platform.slug).sort();
  const selectedSlugs = corpusSelection.selected.map((platform) => platform.slug).sort();
  assert.deepEqual(platformSlugs, selectedSlugs);
  assert.equal(new Set(selectedSlugs).size, 155);
});

test("les noms enrichis couvrent exactement la liste DGFiP sans doublon", () => {
  const enrichedNames = platforms.map((platform) => platform.officialName).sort();
  const approvedNames = officialDirectory.approved.map((entry) => entry.name).sort();
  assert.deepEqual(enrichedNames, approvedNames);
  assert.equal(new Set(enrichedNames).size, 155);
});

test("la date d'immatriculation accepte le libellé DGFiP exact sans texte arbitraire", () => {
  const platform = platforms[0]!;
  for (const value of ["2026-10-13", "En attente", "à venir"]) {
    assert.equal(platformSchema.safeParse({ ...platform, registeredAt: { ...platform.registeredAt, value } }).success, true, value);
  }
  for (const value of ["en attente", "En attente ", "Pending", "2026-02-30", "2026-10-13T00:00:00Z", "inconnue"]) {
    assert.equal(platformSchema.safeParse({ ...platform, registeredAt: { ...platform.registeredAt, value } }).success, false, value);
  }
});

test("une cible non documentée accepte une liste vide sans relâcher les tailles autorisées", () => {
  const platform = platforms[0]!;
  assert.equal(platformSchema.safeParse({ ...platform, targets: [] }).success, true);
  assert.equal(platformSchema.safeParse({ ...platform, targets: ["micro"] }).success, true);
  for (const targets of [null, ["inconnue"], ["micro", "entreprise"]]) {
    assert.equal(platformSchema.safeParse({ ...platform, targets }).success, false);
  }
});

test("chaque acteur dispose d'une preuve primaire de sélection", () => {
  const sourceIds = new Set(sources.map((source) => source.id));
  for (const selected of corpusSelection.selected) {
    assert.ok(selected.reachSourceIds.length > 0, `${selected.slug} sans preuve de sélection`);
    assert.ok(selected.reachSourceIds.every((sourceId) => sourceIds.has(sourceId)), `${selected.slug} référence une source absente`);
  }
});

test("les trois fonctions réglementaires ne sont positives qu'avec une preuve forte", () => {
  for (const platform of platforms) {
    for (const field of [platform.receivesInvoices, platform.sendsInvoices, platform.eReporting]) {
      if (field.value !== true) continue;
      assert.ok(field.status === "official" || field.status === "documented", `${platform.slug} contient un oui trop faible`);
      assert.ok(field.sourceIds.length > 0, `${platform.slug} contient un oui sans source`);
    }
  }
});
