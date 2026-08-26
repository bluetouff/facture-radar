import test from "node:test";
import assert from "node:assert/strict";
import { findAnswers } from "../src/lib/answer-finder.ts";

test("une formulation métier courte trouve la réponse Factur-X directe", () => {
  const [answer] = findAnswers("Je cherche une PA prenant mon PDF FacturX EN sans passer par une SC");
  assert.equal(answer?.href, "/questions/envoyer-factur-x-sans-solution-compatible/");
});

test("le nom d'un outil ouvre directement sa conclusion préremplie", () => {
  const [answer] = findAnswers("Tiime");
  assert.equal(answer?.kind, "Vérifier mon outil");
  assert.equal(answer?.href, "/verifier-mon-outil/#outil=Tiime");
});

test("les besoins courants mènent vers une réponse pratique", () => {
  assert.equal(findAnswers("gratuite sans compte bancaire")[0]?.href, "/questions/plateforme-gratuite-sans-compte-bancaire/");
  assert.equal(findAnswers("travailler avec mon expert comptable")[0]?.href, "/questions/plateforme-pour-travailler-avec-comptable/");
  assert.equal(findAnswers("récupérer mes factures si je change")[0]?.href, "/questions/recuperer-ses-factures-en-changeant-de-plateforme/");
});

test("une question hors corpus ne fabrique pas de réponse", () => {
  assert.deepEqual(findAnswers("réserver un billet de train"), []);
});
