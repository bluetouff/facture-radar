import test from "node:test";
import assert from "node:assert/strict";
import sources from "../src/data/sources.json" with { type: "json" };
import { platforms } from "../src/data/platforms.ts";
import { practicalQuestions, practicalQuestionSourceIds } from "../src/data/practical-questions.ts";

test("la bibliothèque publie exactement quinze questions à URL stable", () => {
  assert.equal(practicalQuestions.length, 15);
  assert.equal(new Set(practicalQuestions.map((question) => question.slug)).size, 15);
  for (const question of practicalQuestions) {
    assert.match(question.slug, /^[a-z0-9-]+$/);
    assert.ok(question.shortAnswer.length >= 30);
    assert.ok(question.shortAnswer.length <= 220);
    assert.equal(question.checks.length, 4);
    assert.ok(question.recommendations.length >= 3);
    assert.ok(question.nextAction.href.startsWith("/"));
  }
});

test("chaque recommandation de plateforme renvoie vers une fiche existante et une source", () => {
  const platformSlugs = new Set(platforms.map((platform) => platform.slug));
  for (const question of practicalQuestions) {
    for (const recommendation of question.recommendations) {
      if (recommendation.platformSlug === null) continue;
      assert.ok(platformSlugs.has(recommendation.platformSlug), `${question.slug}: ${recommendation.platformSlug}`);
      assert.ok(recommendation.sourceIds.length > 0, `${question.slug}: ${recommendation.label}`);
      assert.equal(recommendation.href, `/plateformes/${recommendation.platformSlug}/`);
    }
  }
});

test("toutes les sources des questions existent et sont antérieures à leur contrôle", () => {
  const sourcesById = new Map(sources.map((source) => [source.id, source]));
  assert.equal(new Set(practicalQuestionSourceIds).size, practicalQuestionSourceIds.length);
  for (const question of practicalQuestions) {
    const sourceIds = [...question.sourceIds, ...question.recommendations.flatMap((recommendation) => recommendation.sourceIds)];
    for (const sourceId of sourceIds) {
      const source = sourcesById.get(sourceId);
      assert.ok(source, `${question.slug}: ${sourceId}`);
      assert.ok(source.accessedAt <= question.checkedAt, `${question.slug}: ${sourceId}`);
    }
  }
});

test("les calculs publics sur douze et vingt-quatre mois restent explicites", () => {
  const costQuestion = practicalQuestions.find((question) => question.slug === "cout-plateforme-sur-12-24-mois");
  assert.ok(costQuestion);
  assert.ok(costQuestion.recommendations.some((recommendation) => recommendation.label.includes("84 €") && recommendation.label.includes("168 €")));
  assert.ok(costQuestion.recommendations.some((recommendation) => recommendation.label.includes("588 €") && recommendation.label.includes("1 176 €")));
});

test("le wording des questions ne contient pas de tiret cadratin", () => {
  assert.equal(JSON.stringify(practicalQuestions).includes("—"), false);
});
