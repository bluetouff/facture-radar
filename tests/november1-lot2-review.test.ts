import test from "node:test";
import assert from "node:assert/strict";
import { platforms } from "../src/data/platforms.ts";
import { matchPlatform } from "../src/lib/matcher.ts";
import { buildInvoiceJourney } from "../src/lib/journey.ts";
import { researchForPlatform } from "../src/data/platform-research.ts";
import type { DiagnosticInput } from "../src/data/types.ts";

test("macompta : la gratuité initiale ne produit pas un abonnement uniforme sur trois ans", () => {
  const platform = platforms.find(item => item.slug === "macompta")!;
  for (const monthlyInvoices of [1, 20, 21, 250, 251]) {
    const input: DiagnosticInput = { size: "pme", monthlyInvoices, freeOnly: true, noBankAccount: false, needsAccountantAccess: false, needsApi: false, needsInternationalReporting: false };
    const result = matchPlatform(platform, input);
    assert.equal(result.annualCost, null);
    assert.equal(result.blockers.some(item => /dépasse le plafond gratuit/.test(item)), monthlyInvoices > 20);
  }
  for (const audience of ["micro", "tpe-pme", "eti-ge"] as const) {
    const journey = buildInvoiceJourney(platforms, { tool: "macompta.fr", audience, activation: "yes" })!;
    assert.equal(journey.cost.baseMonthlyFrom, null);
    assert.equal(journey.cost.paMonthlySurcharge, null);
    assert.deepEqual(journey.cost.horizons, []);
  }
  assert.match(platform.pricing.value!.label, /Première année gratuite/);
  assert.match(platform.allowance.value!.label, /deuxième année.*20.*250/);
});

test("WeInvoice : API payante et déclaration ISO restent distinctes de l’offre Free et d’un certificat", () => {
  const platform = platforms.find(item => item.slug === "weproc")!;
  assert.equal(platform.publicApi.value!.includedInFree, false);
  const research = researchForPlatform("weproc");
  assert.equal(research.iso27001Scope.status, "declared");
  assert.equal(research.iso27001Scope.value!.certificateNumber, null);
  assert.equal(research.iso27001Scope.value!.validUntil, null);
  assert.equal(research.iso27001Scope.value!.platformRelation, "organization_only");
  assert.equal(research.exitTerms.value!.bulkExport, true);
  assert.equal(platform.integrations.value!.includes("Shopify"), false);
});

test("DigiPA : le minimum récurrent inclut l’abonnement officine, pas l’essai gratuit", () => {
  const platform = platforms.find(item => item.slug === "digipharmacie")!;
  const journey = buildInvoiceJourney(platforms, { tool: "DigiPA", audience: "tpe-pme", activation: "yes" })!;
  assert.equal(platform.pricing.value!.monthlyFrom, 35);
  assert.equal(journey.cost.baseMonthlyFrom, 35);
  assert.equal(journey.cost.paMonthlySurcharge, 0);
  assert.deepEqual(journey.cost.horizons.map(item => item.minimum), [420, 840, 1260]);
  assert.match(journey.cost.caveat, /500 factures.*0,07 € HT.*hors dépassement/);
});
