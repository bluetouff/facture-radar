import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { platforms } from "../src/data/platforms.ts";
import { partitionDiagnosticResults, runDiagnostic } from "../src/lib/matcher.ts";
import type { DiagnosticInput } from "../src/data/types.ts";

const base: DiagnosticInput = {
  size: "micro",
  monthlyInvoices: 8,
  freeOnly: true,
  noBankAccount: true,
  needsAccountantAccess: false,
  needsApi: false,
  needsInternationalReporting: false,
};

test("un indépendant obtient plusieurs parcours gratuits sans compte bancaire", () => {
  const eligible = runDiagnostic(platforms, base).filter((result) => result.eligible);
  assert.ok(eligible.length >= 3);
  assert.ok(eligible.some((result) => result.platform.slug === "qonto"));
  assert.ok(eligible.some((result) => result.platform.slug === "indy"));
  assert.ok(eligible.some((result) => result.platform.slug === "tiime"));
  assert.ok(eligible.some((result) => result.platform.slug === "abby"));
});

test("le parcours sépare toutes les réponses confirmées sans fabriquer de top 3", () => {
  const results = runDiagnostic(platforms, {
    ...base,
    freeOnly: false,
    noBankAccount: false,
  });
  const partition = partitionDiagnosticResults(results);
  assert.ok(partition.eligible.length > 3);
  assert.equal(partition.eligible.length + partition.unconfirmed.length, results.length);
  assert.ok(partition.eligible.every((result) => result.eligible));
  assert.ok(partition.unconfirmed.every((result) => !result.eligible));
});

test("les réponses confirmées sont alphabétiques et non classées par documentation", () => {
  const results = runDiagnostic(platforms, {
    ...base,
    freeOnly: true,
    noBankAccount: false,
  }).filter((result) => result.eligible);
  const names = results.map((result) => result.platform.displayName);
  assert.deepEqual(names, [...names].sort((left, right) => left.localeCompare(right, "fr")));
});

test("une exigence API gratuite échoue lorsque l'inclusion gratuite n'est pas prouvée", () => {
  const eligible = runDiagnostic(platforms, { ...base, needsApi: true }).filter((result) => result.eligible);
  assert.equal(eligible.length, 0);
});

test("Qonto reste bloqué lorsque l'e-reporting généralisé est indispensable", () => {
  const qonto = runDiagnostic(platforms, { ...base, needsInternationalReporting: true })
    .find((result) => result.platform.slug === "qonto");
  assert.ok(qonto);
  assert.equal(qonto.eligible, false);
  assert.ok(qonto.unknowns.includes("E-reporting B2C et international"));
});

test("une API documentée peut qualifier un parcours payant", () => {
  const results = runDiagnostic(platforms, {
    ...base,
    size: "pme",
    monthlyInvoices: 200,
    freeOnly: false,
    noBankAccount: false,
    needsApi: true,
    needsInternationalReporting: false,
  });
  assert.ok(results.some((result) => result.eligible && result.platform.slug === "septeo"));
  assert.ok(results.some((result) => result.eligible && result.platform.slug === "pennylane"));
});

test("les inconnues obligatoires bloquent au lieu d'être assimilées à un oui", () => {
  const cegid = runDiagnostic(platforms, { ...base, noBankAccount: true, freeOnly: false })
    .find((result) => result.platform.slug === "cegid");
  assert.ok(cegid);
  assert.equal(cegid.eligible, false);
  assert.ok(cegid.blockers.some((blocker) => blocker.includes("information publique à confirmer")));
});

test("une valeur déclarée sans preuve forte est traitée comme inconnue", () => {
  const alteredPlatforms = platforms.map((platform) => platform.slug === "qonto" ? {
    ...platform,
    bankAccountRequired: { ...platform.bankAccountRequired, status: "declared" as const },
  } : platform);
  const qonto = runDiagnostic(alteredPlatforms, base).find((result) => result.platform.slug === "qonto");
  assert.ok(qonto);
  assert.equal(qonto.eligible, false);
  assert.ok(qonto.unknowns.includes("Compte bancaire obligatoire ou facultatif"));
});

test("l'interface explique l'absence de classement et n'affiche plus de faux top 3", async () => {
  const source = await readFile(new URL("../src/components/DiagnosticEngine.astro", import.meta.url), "utf8");
  const visual = await readFile(new URL("../src/components/ChoiceMap.astro", import.meta.url), "utf8");
  assert.match(source, /ordre alphabétique, aucun score ni classement caché/);
  assert.match(visual, /Toutes les options confirmées/);
  assert.doesNotMatch(`${source}\n${visual}`, /Voici trois options|OPTION 0|Meilleur point de départ|featured|compatibility/);
});
