import assert from "node:assert/strict";
import test from "node:test";
import { platformIncidents, validateIncidents } from "../src/data/incident-watch.ts";
import { platforms } from "../src/data/platforms.ts";
import { researchForPlatform } from "../src/data/platform-research.ts";
import { matchPlatform } from "../src/lib/matcher.ts";

test("blgCloud : le suivi de septembre qualifie l’incident de l’été sans inventer une nouvelle attaque PA", () => {
  const event = platformIncidents.find(e => e.id === "blg-security-followup-20260910")!;
  assert.equal(event.kind, "security");
  assert.equal(event.scope, "publisher_service");
  assert.equal(event.startedAt, null);
  assert.equal(event.firstReportedAt, "2026-08-10");
  assert.equal(event.updatedAt, "2026-09-10");
  assert.throws(() => validateIncidents([{ ...event, updatedAt: "2026-08-10" }]));
});

test("fulll : les reprises PA restent distinctes des clôtures des autres applications", () => {
  for (const [id, resolution, updated] of [
    ["fulll-1119878", "2026-11-09T21:43:00Z", "2026-11-09T22:32:00Z"],
    ["fulll-1120747", "2026-11-10T08:54:00Z", "2026-11-10T09:08:00Z"],
  ]) {
    const event = platformIncidents.find(e => e.id === id)!;
    assert.equal(event.scope, "pa");
    assert.equal(event.resolutionReportedAt, resolution);
    assert.equal(event.updatedAt, updated);
  }
});

test("Ponsot : contrat annuel et fonctions annoncées ne deviennent pas une PA gratuite déjà activée", () => {
  const platform = platforms.find(p => p.slug === "ponsot-conseil-gestion")!;
  const result = matchPlatform(platform, { size: "tpe", monthlyInvoices: 10, freeOnly: true, noBankAccount: false, needsAccountantAccess: false, needsApi: false, needsInternationalReporting: false });
  assert.equal(result.eligible, false);
  assert.ok(Math.abs(platform.pricing.value!.monthlyFrom! * 12 - 100) < 1e-10);
  assert.equal(platform.commitmentMonths.value, 12);
  assert.equal(platform.sendsInvoices.value, null);
  assert.equal(platform.receivesInvoices.value, null);
  assert.equal(researchForPlatform(platform.slug).availability.sendsInvoices.value!.stage, "announced");
  const konica = platforms.find(p => p.slug === "konica-minolta")!;
  assert.equal(konica.sendsInvoices.value, null);
  assert.equal(researchForPlatform(konica.slug).directImport.value, null);
});
