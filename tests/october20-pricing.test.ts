import test from "node:test";
import assert from "node:assert/strict";
import { platforms } from "../src/data/platforms.ts";
import { matchPlatform } from "../src/lib/matcher.ts";
import { buildInvoiceJourney, findJourneyProfile } from "../src/lib/journey.ts";
import type { DiagnosticInput } from "../src/data/types.ts";

const paidInput: DiagnosticInput = {
  size: "pme", monthlyInvoices: 1, freeOnly: false, noBankAccount: false,
  needsAccountantAccess: false, needsApi: false, needsInternationalReporting: false,
};

test("Gestav conserve ses montants annuels TTC sans coût annuel HT calculé", () => {
  const platform = platforms.find(item => item.slug === "gestav")!;
  assert.equal(platform.pricing.value?.monthlyFrom, null);
  assert.equal(matchPlatform(platform, paidInput).annualCost, null);
  assert.match(platform.pricing.value?.label ?? "", /24,90 € TTC\/an/);
  assert.match(platform.pricing.value?.label ?? "", /69,90 € TTC\/an/);
  assert.match(platform.pricing.value?.label ?? "", /24,90 € HT\/an/);
});

test("le parcours Gestav ne projette pas un tarif TTC comme un montant HT", () => {
  for (const audience of ["micro", "tpe-pme", "eti-ge"] as const) {
    const journey = buildInvoiceJourney(platforms, { tool: "Gestav", audience, activation: "yes" });
    assert.ok(journey);
    assert.equal(journey.cost.baseMonthlyFrom, null);
    assert.equal(journey.cost.paMonthlySurcharge, null);
    assert.deepEqual(journey.cost.horizons, []);
    assert.match(journey.cost.label, /24,90 € TTC\/an/);
    assert.match(journey.cost.label, /69,90 € TTC\/an/);
    assert.match(journey.cost.caveat, /24,90 € HT\/an/);
  }
});

test("les crédits ZenPA ne garantissent pas un quota gratuit de factures", () => {
  const platform = platforms.find(item => item.slug === "entropics")!;
  assert.equal(platform.displayName, "Entropics ZenPA");
  assert.deepEqual(platform.targets, ["tpe", "pme"]);
  assert.equal(platform.allowance.value?.monthlyInvoices, null);
  assert.equal(platform.allowance.value?.annualInvoices, null);
  assert.equal(platform.allowance.value?.unlimited, false);
  assert.match(platform.allowance.value?.label ?? "", /5 crédits/);
  assert.match(platform.allowance.value?.label ?? "", /pièces jointes/);
  for (const monthlyInvoices of [0, 1, 5, 10, 100]) {
    const result = matchPlatform(platform, { ...paidInput, monthlyInvoices, freeOnly: true });
    assert.equal(result.eligible, false, `Volume ${monthlyInvoices}`);
    assert.equal(result.annualCost, null);
    assert.ok(!result.reasons.some(reason => /Offre gratuite adaptée au volume/.test(reason)));
  }
});

test("les alias ZenPA et ZenOnline conservent un coût à qualifier", () => {
  assert.equal(findJourneyProfile("ZenPA"), "entropics");
  assert.equal(findJourneyProfile("ZenOnline"), "entropics");
  assert.equal(findJourneyProfile("Entropics ZenPA"), "entropics");
  for (const audience of ["micro", "tpe-pme", "eti-ge"] as const) {
    const journey = buildInvoiceJourney(platforms, { tool: "ZenPA", audience, activation: "yes" });
    assert.ok(journey);
    assert.equal(journey.cost.baseMonthlyFrom, null);
    assert.deepEqual(journey.cost.horizons, []);
    assert.match(journey.cost.label, /crédits/);
    assert.match(journey.cost.caveat, /tous les flux/);
    assert.match(journey.cost.caveat, /pièce jointe/);
  }
});

test("Facnote sépare l’abonnement HT des frais uniques et par envoi", () => {
  const platform = platforms.find(item => item.slug === "facnote")!;
  assert.equal(platform.pricing.value?.monthlyFrom, null);
  assert.equal(matchPlatform(platform, paidInput).annualCost, null);
  const journey = buildInvoiceJourney(platforms, { tool: "Facnote", audience: "tpe-pme", activation: "yes" });
  assert.ok(journey);
  assert.equal(journey.cost.baseMonthlyFrom, null);
  assert.deepEqual(journey.cost.horizons, []);
  assert.match(journey.cost.label, /120 € HT\/an/);
  assert.match(journey.cost.label, /50 € HT/);
  assert.match(journey.cost.caveat, /5 € HT\/envoi/);
  assert.match(journey.cost.caveat, /0,28 € HT\/facture/);
});

test("Dext ne projette pas une gratuité générale au-delà de son quota de documents de vente", () => {
  for (const audience of ["micro", "tpe-pme", "eti-ge"] as const) {
    const journey = buildInvoiceJourney(platforms, { tool: "Dext", audience, activation: "yes" });
    assert.ok(journey);
    assert.equal(journey.cost.baseMonthlyFrom, null);
    assert.equal(journey.cost.paMonthlySurcharge, null);
    assert.deepEqual(journey.cost.horizons, []);
    assert.match(journey.cost.label, /5 documents de vente par an/);
    assert.match(journey.cost.caveat, /Factures, acomptes et avoirs/);
    assert.match(journey.cost.caveat, /coût dépend de l’offre payante/);
    assert.ok(journey.cost.sourceIds.includes("dext-pricing-2026"));
    assert.ok(journey.cost.sourceIds.includes("dext-free-limits-20261013"));
  }
});

test("Indy conserve sa réception gratuite sans chiffrer une émission PA à PA indisponible", () => {
  for (const audience of ["micro", "tpe-pme", "eti-ge"] as const) {
    const journey = buildInvoiceJourney(platforms, { tool: "Indy", audience, activation: "yes" });
    assert.ok(journey);
    assert.equal(journey.status, "action");
    assert.equal(journey.nodes.find(node => node.label === "Flux couverts")?.state, "action");
    assert.equal(journey.cost.baseMonthlyFrom, null);
    assert.equal(journey.cost.paMonthlySurcharge, null);
    assert.deepEqual(journey.cost.horizons, []);
    assert.match(journey.cost.label, /Réception électronique et facturation classique annoncées gratuites/);
    assert.match(journey.cost.label, /émission PA à PA indisponible/);
    assert.match(journey.cost.caveat, /solution complémentaire d’émission, qui n’est pas connu/);
    assert.ok(journey.cost.sourceIds.includes("indy-billing-2026"));
    assert.ok(journey.cost.sourceIds.includes("indy-emission-20261020"));
  }
});
