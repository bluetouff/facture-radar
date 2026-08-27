import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  answerQuestion,
  corpusManifest,
  findPlatforms,
  getPlatform,
  getResourceByUri,
  searchOfficialDirectory,
} from "../src/mcp/corpus.ts";

const revision = {
  revision: "cb1138871a820b7a7c54269e998337227a70177b",
  builtAt: "2026-08-26T00:00:00.000Z",
};

test("le MCP répond à la question Factur-X avec la réponse publiée", () => {
  const result = answerQuestion("Je cherche une PA pour envoyer mon PDF Factur-X sans solution compatible", 3);
  assert.equal(result.found, true);
  assert.equal(result.answer?.slug, "envoyer-factur-x-sans-solution-compatible");
  assert.match(result.answer?.answer ?? "", /B2Brouter/);
  assert.ok(result.answer?.recommendations.every((recommendation) => recommendation.sources.length > 0));
});

test("le MCP et le site couvrent les questions de lancement", () => {
  const expected = new Map([
    ["Quand dois-je être prêt ?", "calendrier-facturation-electronique-2026-2027"],
    ["Comment savoir si une plateforme est agréée ?", "verifier-plateforme-agreee-dgfip"],
    ["Un PDF envoyé par email suffit-il ?", "pdf-email-facture-electronique"],
    ["Comment vérifier un Factur-X avant envoi ?", "verifier-factur-x-avant-envoi"],
    ["Quelle différence entre facture électronique et e-reporting ?", "difference-facture-electronique-e-reporting"],
    ["J'utilise Qonto, dois-je changer ?", "garder-son-logiciel-de-facturation"],
  ]);
  for (const [query, slug] of expected) assert.equal(answerQuestion(query, 3).answer?.slug, slug, query);
});

test("une question absente reste absente", () => {
  const result = answerQuestion("culture hydroponique martienne", 3);
  assert.equal(result.found, false);
  assert.equal(result.answer, null);
  assert.equal(result.fallback?.availableQuestions.length, 25);
});

test("une fiche ne transforme pas une inconnue en réponse positive", () => {
  const qonto = getPlatform("Qonto");
  assert.ok(qonto);
  assert.equal(qonto.functions.eReporting.value, null);
  assert.equal(qonto.functions.eReporting.status, "non_documented");
  assert.match(qonto.functions.eReporting.note ?? "", /accès bêta limité/);
});

test("la recherche de plateformes renvoie des options traçables et les blocages", () => {
  const result = findPlatforms({
    size: "micro",
    monthlyInvoices: 20,
    freeOnly: true,
    noBankAccount: true,
    needsAccountantAccess: false,
    needsApi: false,
    needsInternationalReporting: false,
    priorities: ["simplicity"],
    limit: 5,
  });
  assert.ok(result.eligibleCount > 0);
  assert.ok(result.options.every((option) => option.sources.length > 0));
  assert.ok(result.options.every((option) => option.fitsAllCriteria));
});

test("l'annuaire MCP distingue approuvé et en attente sans exposer les contacts", () => {
  const matches = searchOfficialDirectory("Abby", "all", 5);
  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.status, "approved");
  assert.equal(Object.hasOwn(matches[0] ?? {}, "contact"), false);
});

test("le manifeste et les ressources couvrent tout le corpus public", () => {
  const manifest = corpusManifest(revision);
  assert.deepEqual(manifest.counts, {
    questions: 25,
    enrichedPlatforms: 148,
    approvedPlatforms: 148,
    pendingPlatforms: 18,
    journeys: 148,
    invoiceRoutes: 6,
    directRoutingOptions: 3,
    sources: 268,
    observedPublicSites: 11,
  });
  const directory = getResourceByUri("pacheck://corpus/official-directory", revision) as { approved: unknown[]; pending: unknown[] };
  assert.equal(directory.approved.length, 148);
  assert.equal(directory.pending.length, 18);
  assert.equal(getResourceByUri("file:///etc/passwd", revision), null);
});

test("le serveur HTTP reste local, borné et sans récupération distante", async () => {
  const source = await readFile(new URL("../src/mcp/http.ts", import.meta.url), "utf8");
  assert.match(source, /const HOST = "127\.0\.0\.1"/);
  assert.match(source, /MAX_BODY_BYTES = 128 \* 1024/);
  assert.match(source, /hostHeaderValidation/);
  assert.match(source, /originValidation/);
  assert.doesNotMatch(source, /x-forwarded-for/i);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /console\.log\s*\(/);
});
