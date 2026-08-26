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

test("les formulations de lancement trouvent les nouvelles réponses directes", () => {
  assert.equal(findAnswers("Quand dois-je être prêt ?")[0]?.href, "/questions/calendrier-facturation-electronique-2026-2027/");
  assert.equal(findAnswers("Comment savoir si une plateforme est agréée ?")[0]?.href, "/questions/verifier-plateforme-agreee-dgfip/");
  assert.equal(findAnswers("Un PDF envoyé par email suffit-il ?")[0]?.href, "/questions/pdf-email-facture-electronique/");
  assert.equal(findAnswers("Comment vérifier un Factur-X avant envoi ?")[0]?.href, "/questions/verifier-factur-x-avant-envoi/");
  assert.equal(findAnswers("Différence entre facture électronique et e-reporting")[0]?.href, "/questions/difference-facture-electronique-e-reporting/");
});

test("une question sur un outil connu ouvre son parcours au lieu d'une réponse générique", () => {
  assert.equal(findAnswers("Puis-je garder Tiime ?")[0]?.href, "/verifier-mon-outil/#outil=Tiime");
  assert.equal(findAnswers("Puis-je garder Abby ?")[0]?.href, "/verifier-mon-outil/#outil=Abby");
  assert.equal(findAnswers("J'utilise Qonto, dois-je changer ?")[0]?.href, "/verifier-mon-outil/#outil=Qonto%20Facturation");
});

test("une question hors corpus ne fabrique pas de réponse", () => {
  assert.deepEqual(findAnswers("réserver un billet de train"), []);
});
