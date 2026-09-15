import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import directory from "../src/data/official-directory.json" with { type: "json" };
import { platforms } from "../src/data/platforms.ts";
import { researchForPlatform } from "../src/data/platform-research.ts";
import { matchPlatform } from "../src/lib/matcher.ts";
import { buildInvoiceJourney, findJourneyProfile } from "../src/lib/journey.ts";
import { passportRoutes } from "../src/data/passport-routes.ts";

test("le relevé du 10 septembre distingue admissions, disparition et dates corrigées", async () => {
  assert.equal(directory.snapshotDate, "2026-09-10");
  assert.equal(directory.approved.length, 149);
  assert.equal(directory.pending.length, 16);
  const expected = new Map([
    ["BLG", "2026-08-26"], ["FISKALTRUST", "2026-08-28"],
    ["CYCLOPE", "2026-08-25"], ["LUNDI MATIN", "2026-08-24"], ["VENTYA", "2025-12-18"],
  ]);
  for (const [name, date] of expected) {
    assert.equal(directory.approved.find((entry) => entry.name === name)?.registeredAt, date);
    assert.equal(platforms.find((platform) => platform.officialName === name)?.registeredAt.value, date);
    assert.ok(!directory.pending.some((entry) => entry.name === name));
  }
  assert.ok(!platforms.some((platform) => platform.officialName === "ECOSIO"));
  assert.ok(platforms.some((platform) => platform.officialName === "ecosio InterCom, a Vertex Company"));
  const archive = JSON.parse(await readFile(new URL("../docs/archives/ecosio-2026-08-26.json", import.meta.url), "utf8"));
  assert.equal(archive.platform.officialName, "ECOSIO");
  assert.equal(archive.journey.platformSlug, "ecosio");
});

test("B2Brouter reste payant pour la conformité France même à très faible volume", () => {
  const platform = platforms.find((candidate) => candidate.slug === "b2brouter")!;
  for (const monthlyInvoices of [0, 1, 2, 1000]) {
    const input = { size: "micro" as const, monthlyInvoices, freeOnly: true, noBankAccount: false, needsAccountantAccess: false, needsApi: false, needsInternationalReporting: true };
    assert.equal(matchPlatform(platform, input).eligible, false);
    const paid = matchPlatform(platform, { ...input, freeOnly: false });
    assert.equal(paid.eligible, true);
    assert.equal(paid.annualCost, 110);
  }
  const journey = buildInvoiceJourney(platforms, { tool: "B2BRouter", audience: "micro", activation: "yes" });
  assert.ok(journey);
  assert.equal(journey.cost.baseMonthlyFrom, 110 / 12);
  assert.match(passportRoutes.find((route) => route.slug === "b2brouter")!.cost.value, /110/);
});

test("les nouvelles fiches ne déduisent ni prix ni disponibilité de l'agrément", () => {
  assert.equal(findJourneyProfile("blgCloud"), "blg");
  assert.equal(findJourneyProfile("fiskaltrust"), "fiskaltrust");
  for (const slug of ["blg", "fiskaltrust"]) {
    const platform = platforms.find((candidate) => candidate.slug === slug)!;
    assert.equal(platform.pricing.value, null);
    assert.equal(platform.publicApi.value, null);
    assert.equal(researchForPlatform(slug).availability.eReporting.value, null);
    assert.equal(researchForPlatform(slug).availability.eReporting.checkedAt, "2026-09-14");
  }
  assert.equal(platforms.find((candidate) => candidate.slug === "fiskaltrust")!.eReporting.value, null);
});

test("hébergement PA et certificats conservent leurs périmètres et dates propres", () => {
  const pennylane = researchForPlatform("pennylane");
  assert.deepEqual(pennylane.hostingProviders.value, ["Outscale", "S3NS", "Scalingo"]);
  assert.equal(pennylane.hostingProviders.status, "declared");
  assert.equal(pennylane.iso27001Scope.value?.platformRelation, "service_family");
  assert.equal(pennylane.iso27001Scope.value?.validUntil, "2026-09-19");
  const doxallia = researchForPlatform("doxallia").iso27001Scope;
  assert.equal(doxallia.value?.validity, "expired");
  assert.notEqual(doxallia.value?.validUntil, "2029-06-19");
  assert.ok(doxallia.sourceIds.includes("doxallia-hds-2026-09"));
  assert.equal(researchForPlatform("qonto").availability.eReporting.value?.stage, "beta");
  assert.equal(researchForPlatform("qonto").availability.eReporting.checkedAt, "2026-09-14");
  assert.equal(platforms.find((platform) => platform.slug === "sage")!.pricing.checkedAt, "2026-08-25");
});


test("le quota Lundi Matin ne devient jamais un nombre de factures", () => {
  const platform = platforms.find((candidate) => candidate.slug === "lundi-matin")!;
  assert.equal(platform.allowance.value?.monthlyInvoices, null);
  assert.equal(platform.allowance.value?.unlimited, false);
  const input = { size: "tpe" as const, monthlyInvoices: 1, freeOnly: true, noBankAccount: false, needsAccountantAccess: false, needsApi: false, needsInternationalReporting: false };
  assert.equal(matchPlatform(platform, input).eligible, false);
  const journey = buildInvoiceJourney(platforms, { tool: "LMB", audience: "tpe-pme", activation: "yes" });
  assert.ok(journey);
  assert.equal(journey.cost.baseMonthlyFrom, null);
});
