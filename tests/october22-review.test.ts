import test from "node:test";
import assert from "node:assert/strict";
import { platforms } from "../src/data/platforms.ts";
import { matchPlatform } from "../src/lib/matcher.ts";
import { buildInvoiceJourney } from "../src/lib/journey.ts";
import { platformIncidents } from "../src/data/incident-watch.ts";
import type { DiagnosticInput } from "../src/data/types.ts";

test("Lucca : un prix par facture ne devient pas un abonnement ni un coût annuel", () => {
  const lucca = platforms.find(item => item.slug === "lucca")!;
  for (const monthlyInvoices of [1, 700, 10_000]) {
    const input: DiagnosticInput = { size: "pme", monthlyInvoices, freeOnly: false, noBankAccount: false, needsAccountantAccess: false, needsApi: false, needsInternationalReporting: false };
    assert.equal(matchPlatform(lucca, input).annualCost, null);
  }
  const journey = buildInvoiceJourney(platforms, { tool: "Lucca", audience: "tpe-pme", activation: "yes" })!;
  assert.equal(journey.cost.baseMonthlyFrom, null);
  assert.equal(journey.cost.paMonthlySurcharge, null);
  assert.match(lucca.pricing.value!.label, /0,91 € HT par facture pour 600 à 799 factures/);
});

test("les mesures PHP et AR24 conservent leur service et leur état de reprise propres", () => {
  const atgp = platformIncidents.find(item => item.id === "atgp-beefact-20261021")!;
  assert.equal(atgp.kind, "availability");
  assert.equal(atgp.scope, "pa");
  assert.equal(atgp.status, "resolved");
  assert.equal(atgp.resolutionReportedAt, "2026-10-22");
  assert.equal(atgp.firstReportedAt, null);
  assert.match(atgp.limitations, /notice générale reste En cours/);
  const esker = platformIncidents.find(item => item.id === "esker-ar24-ere-20261021")!;
  assert.equal(esker.kind, "availability");
  assert.equal(esker.scope, "upstream");
  assert.equal(esker.resolutionReportedAt, null);
  assert.match(esker.limitations, /environnement L.*n’est pas cité/);
  const tungsten = platformIncidents.find(item => item.id === "tungsten-france-20261013")!;
  assert.equal(tungsten.startedAt, "2026-10-12T06:51:00Z");
  assert.equal(tungsten.resolutionReportedAt, "2026-10-19T11:30:54.571Z");
  assert.match(tungsten.summary, /14 à 15 h 17 UTC/);
});
