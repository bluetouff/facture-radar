import test from "node:test";
import assert from "node:assert/strict";
import { platforms } from "../src/data/platforms.ts";
import { researchForPlatform } from "../src/data/platform-research.ts";
import { directoryFacts, factState, sanitizeSelection } from "../src/lib/explorer.ts";
import { comparisonFacts, sameComparisonFact } from "../src/lib/comparison.ts";
import { platformUpdates } from "../src/data/platform-updates.ts";
import { questionExploration } from "../src/data/question-exploration.ts";
import { practicalQuestions } from "../src/data/practical-questions.ts";
import sources from "../src/data/sources.json" with { type: "json" };

const platform = (slug: string) => platforms.find(item => item.slug === slug)!;
const facts = (slug: string) => directoryFacts(platform(slug), researchForPlatform(slug));

test("la sélection refuse les identifiants inconnus, doublons, objets et débordements", () => {
  const allowed = new Set(["abby", "tiime", "b2brouter", "sage"]);
  assert.deepEqual(sanitizeSelection(["abby", "abby", null, {}, "__proto__", "<img src=x onerror=alert(1)>", "tiime", "b2brouter", "sage"], allowed), ["abby", "tiime", "b2brouter"]);
  assert.deepEqual(sanitizeSelection({ abby: true }, allowed), []);
  assert.deepEqual(sanitizeSelection("abby,tiime", allowed), []);
});

test("un critère inconnu ou déclaré ne devient pas un oui ou un non publié", () => {
  const evidence = { value: true, status: "non_documented" as const, checkedAt: "2026-09-14", sourceIds: [] };
  assert.equal(factState(evidence, true), "unknown");
  assert.equal(factState({ ...evidence, status: "documented" }, true), "unknown");
  assert.equal(factState({ ...evidence, status: "declared", sourceIds: ["source"] }, true), "declared");
  assert.equal(factState({ ...evidence, status: "documented", sourceIds: ["source"] }, false), "no");
  assert.equal(facts("blg").price, "unknown");
  assert.equal(facts("fiskaltrust").api, "unknown");
});

test("l'import PDF/XML n'est pas assimilé à un import Factur-X", () => {
  assert.equal(facts("b2brouter").facturx, "unknown");
  assert.equal(facts("dext").facturx, "unknown");
  assert.equal(facts("pennylane").facturx, "yes");
  assert.equal(facts("b2brouter").price, "paid");
});

test("le comparateur préserve tarifs, unités, limites et preuves", () => {
  const b2b = comparisonFacts(platform("b2brouter"), researchForPlatform("b2brouter"));
  assert.match(b2b.find(item => item.key === "price")!.text, /110/);
  assert.match(b2b.find(item => item.key === "import")!.text, /XML embarqué conservé : à confirmer/);
  assert.deepEqual(b2b.find(item => item.key === "price")!.evidence, platform("b2brouter").pricing);
  const lundi = comparisonFacts(platform("lundi-matin"), researchForPlatform("lundi-matin"));
  assert.equal(lundi.find(item => item.key === "allowance")!.text, platform("lundi-matin").allowance.value?.label);
  const keys = b2b.map(item => item.key);
  for (const item of platforms) assert.deepEqual(comparisonFacts(item, researchForPlatform(item.slug)).map(fact => fact.key), keys);
});

test("les différences incluent le statut documentaire et les réserves", () => {
  const fact = comparisonFacts(platform("tiime"), researchForPlatform("tiime"))[0]!;
  assert.equal(sameComparisonFact([fact, structuredClone(fact)]), true);
  assert.equal(sameComparisonFact([fact, { ...fact, evidence: { ...fact.evidence, status: "non_documented" } }]), false);
  assert.equal(sameComparisonFact([fact, { ...fact, evidence: { ...fact.evidence, note: "Condition différente" } }]), false);
  assert.equal(sameComparisonFact([fact, { ...fact, evidence: { ...fact.evidence, value: ["micro"] } }]), false);
  assert.equal(sameComparisonFact([]), false);
});

test("les nouveautés datées et parcours SEO renvoient à des fiches et preuves existantes", () => {
  const sourceIds = new Set(sources.map(source => source.id));
  const slugs = new Set(platforms.map(item => item.slug));
  const questions = new Set(practicalQuestions.map(item => item.slug));
  assert.equal(new Set(platformUpdates.map(update => update.id)).size, platformUpdates.length);
  for (const update of platformUpdates) {
    assert.match(update.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(update.slugs.every(slug => slugs.has(slug)));
    assert.ok(update.sourceIds.length && update.sourceIds.every(id => sourceIds.has(id)));
  }
  for (const [slug, exploration] of Object.entries(questionExploration)) {
    assert.ok(questions.has(slug));
    assert.ok(exploration.related.every(id => questions.has(id) && id !== slug));
    assert.ok(exploration.extraPlatforms?.every(id => slugs.has(id)) ?? true);
    assert.match(exploration.directoryHref, /^\/annuaire\/(#|$)/);
  }
});
