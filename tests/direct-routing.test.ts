import test from "node:test";
import assert from "node:assert/strict";
import sources from "../src/data/sources.json" with { type: "json" };
import directory from "../src/data/official-directory.json" with { type: "json" };
import { directRoutingOptions, directRoutingSourceIds } from "../src/data/direct-routing-options.ts";
import { buildDirectFacturXAnswer } from "../src/lib/direct-routing.ts";

test("le cas Factur-X direct répond avec une piste et le contrôle décisif", () => {
  const answer = buildDirectFacturXAnswer("unknown");

  assert.match(answer.question, /Factur-X.*EN16931/i);
  assert.match(answer.question, /sans.*Solution Compatible/i);
  assert.equal(answer.options[0]?.id, "b2brouter");
  assert.match(answer.explanation, /sans ressaisie/i);
  assert.match(answer.vendorQuestion, /sans OCR/i);
});

test("le moteur ne confond jamais support de format et dépôt d'un fichier tiers", () => {
  const superpdp = directRoutingOptions.find((option) => option.id === "superpdp");
  const dext = directRoutingOptions.find((option) => option.id === "dext");

  assert.ok(superpdp && dext);
  assert.equal(superpdp.facts.find((fact) => /déjà produit/i.test(fact.label))?.state, "unknown");
  assert.equal(dext.facts.find((fact) => /XML EN16931/i.test(fact.label))?.state, "unknown");
});

test("le volume modifie le prix sans modifier les preuves techniques", () => {
  const low = buildDirectFacturXAnswer("up-to-24");
  const medium = buildDirectFacturXAnswer("25-to-1000");
  const lowB2b = low.options.find((option) => option.id === "b2brouter");
  const mediumB2b = medium.options.find((option) => option.id === "b2brouter");

  assert.ok(lowB2b && mediumB2b);
  assert.match(lowB2b.price, /gratuit/i);
  assert.match(mediumB2b.price, /chiffré/i);
  assert.deepEqual(lowB2b.facts, mediumB2b.facts);
});

test("chaque piste est une PA approuvée et chaque affirmation garde une source", () => {
  const approved = new Set(directory.approved.map((entry) => entry.name));
  const sourceIds = new Set(sources.map((source) => source.id));

  assert.ok(directRoutingOptions.every((option) => approved.has(option.officialName)));
  assert.ok(directRoutingOptions.every((option) => option.facts.every((fact) => fact.sourceIds.length > 0)));
  assert.ok(directRoutingSourceIds.every((sourceId) => sourceIds.has(sourceId)));
});
