import test from "node:test";
import assert from "node:assert/strict";
import corpusSelection from "../src/data/corpus-selection.json" with { type: "json" };
import sources from "../src/data/sources.json" with { type: "json" };
import { platforms } from "../src/data/platforms.ts";

test("le corpus contient exactement les cinquante acteurs sélectionnés", () => {
  const platformSlugs = platforms.map((platform) => platform.slug).sort();
  const selectedSlugs = corpusSelection.selected.map((platform) => platform.slug).sort();
  assert.deepEqual(platformSlugs, selectedSlugs);
  assert.equal(new Set(selectedSlugs).size, 50);
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
