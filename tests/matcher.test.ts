import test from "node:test";
import assert from "node:assert/strict";
import { platforms } from "../src/data/platforms.ts";
import { runDiagnostic } from "../src/lib/matcher.ts";
import type { DiagnosticInput } from "../src/data/types.ts";

const base: DiagnosticInput = {
  size: "micro",
  monthlyInvoices: 8,
  freeOnly: true,
  noBankAccount: true,
  needsAccountantAccess: false,
  needsApi: false,
  needsInternationalReporting: true,
  priorities: ["simplicity", "documentation"],
};

test("un indépendant obtient plusieurs parcours gratuits sans compte bancaire", () => {
  const eligible = runDiagnostic(platforms, base).filter((result) => result.eligible);
  assert.ok(eligible.length >= 3);
  assert.ok(eligible.some((result) => result.platform.slug === "qonto"));
  assert.ok(eligible.some((result) => result.platform.slug === "shine"));
  assert.ok(eligible.some((result) => result.platform.slug === "dougs"));
});

test("une exigence API gratuite échoue lorsque l'inclusion gratuite n'est pas prouvée", () => {
  const eligible = runDiagnostic(platforms, { ...base, needsApi: true }).filter((result) => result.eligible);
  assert.equal(eligible.length, 0);
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
  assert.ok(results.some((result) => result.eligible && result.platform.slug === "axonaut"));
  assert.ok(results.some((result) => result.eligible && result.platform.slug === "pennylane"));
});

test("les inconnues obligatoires bloquent au lieu d'être assimilées à un oui", () => {
  const cegid = runDiagnostic(platforms, { ...base, noBankAccount: true, freeOnly: false })
    .find((result) => result.platform.slug === "cegid");
  assert.ok(cegid);
  assert.equal(cegid.eligible, false);
  assert.ok(cegid.blockers.some((blocker) => blocker.includes("preuve publique manquante")));
});
