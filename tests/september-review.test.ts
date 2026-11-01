import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import directory from "../src/data/official-directory.json" with { type: "json" };
import previousDirectory from "../docs/archives/official-directory-2026-10-10.json" with { type: "json" };
import sources from "../src/data/sources.json" with { type: "json" };
import { platforms } from "../src/data/platforms.ts";
import { researchForPlatform } from "../src/data/platform-research.ts";
import { matchPlatform } from "../src/lib/matcher.ts";
import { buildInvoiceJourney, findJourneyProfile } from "../src/lib/journey.ts";
import { passportRoutes } from "../src/data/passport-routes.ts";

test("le relevé courant conserve les admissions et corrections documentées en septembre", async () => {
  assert.equal(directory.snapshotDate, "2026-11-01");
  assert.equal(directory.approved.length, 155);
  assert.equal(directory.pending.length, 10);
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

test("les entrées maintenues conservent leurs dates après renommage et passage en historique", () => {
  assert.equal(previousDirectory.snapshotDate, "2026-10-10");
  assert.equal(previousDirectory.approved.length, 149);
  for (const previous of previousDirectory.approved.filter(entry => entry.name !== "DOCPROCESS")) {
    const currentName = previous.name === "ATGP" ? "@GP" : previous.name;
    const entry = directory.approved.find((candidate) => candidate.name === currentName);
    const platform = platforms.find((candidate) => candidate.officialName === currentName);
    assert.ok(entry, `${previous.name} doit rester dans la liste approuvée`);
    assert.ok(platform, `${previous.name} doit conserver sa fiche`);
    assert.equal(entry.registeredAt, previous.registeredAt, previous.name);
    assert.equal(platform.registeredAt.value, previous.registeredAt, previous.name);
    for (const evidence of [platform.officialStatus, platform.registeredAt]) {
      assert.equal(evidence.status, "official", previous.name);
      assert.ok(evidence.sourceIds.includes("dgfip-list-2026-09-10"), previous.name);
      assert.ok(!evidence.sourceIds.includes("dgfip-list-20261014"), previous.name);
      assert.ok(evidence.checkedAt < "2026-10-14", previous.name);
    }
  }
});

test("les six nouvelles PA reproduisent la date En attente sans date fictive", () => {
  const officialSource = sources.find((source) => source.id === "dgfip-list-20261014");
  assert.ok(officialSource);
  assert.equal(officialSource.type, "official-list");
  assert.equal(officialSource.accessedAt, "2026-10-14");
  const previousNames = new Set(previousDirectory.approved.map((entry) => entry.name));
  const additions = directory.approved.filter((entry) => !previousNames.has(entry.name) && !["SWILE", "@GP"].includes(entry.name));
  assert.deepEqual(additions.map((entry) => entry.name).sort(), [
    "BE FRESH S.à r.l.", "FACTUREAPP", "Insiders Technologies GmbH", "KALANDA", "MY-EDDY", "RATIOO",
  ].sort());
  for (const entry of additions) {
    const platform = platforms.find((candidate) => candidate.officialName === entry.name);
    assert.ok(platform, entry.name);
    assert.equal(entry.registeredAt, "En attente", entry.name);
    assert.equal(platform.registeredAt.value, "En attente", entry.name);
    for (const evidence of [platform.officialStatus, platform.registeredAt]) {
      assert.equal(evidence.status, "official", entry.name);
      assert.deepEqual(evidence.sourceIds, ["dgfip-list-20261014"], entry.name);
      assert.equal(evidence.checkedAt, "2026-10-14", entry.name);
    }
    for (const evidence of [platform.sendsInvoices, platform.receivesInvoices, platform.eReporting]) {
      assert.ok(!evidence.sourceIds.includes("dgfip-list-20261014"), `${entry.name} : l'admission ne démontre pas une fonction en production`);
    }
  }
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

test("Flowie sur devis conserve un coût inconnu et des conditions gratuites à confirmer", () => {
  const platform = platforms.find(platform => platform.slug === "flowie")!;
  assert.equal(platform.pricing.value?.kind, "quote");
  assert.equal(platform.pricing.value?.monthlyFrom, null);
  assert.equal(platform.publicApi.value?.includedInFree, null);
  const result = matchPlatform(platform, { size: "pme", monthlyInvoices: 10, freeOnly: false, noBankAccount: false, needsAccountantAccess: false, needsApi: true, needsInternationalReporting: false });
  assert.equal(result.annualCost, null);
  assert.equal(platform.iso27001.checkedAt, "2026-10-02");
});

test("les nouvelles fiches ne déduisent ni prix ni disponibilité de l'agrément", () => {
  assert.equal(findJourneyProfile("blgCloud"), "blg");
  assert.equal(findJourneyProfile("fiskaltrust"), "fiskaltrust");
  for (const slug of ["blg", "fiskaltrust"]) {
    const platform = platforms.find((candidate) => candidate.slug === slug)!;
    assert.equal(platform.pricing.value, null);
    if (slug === "blg") assert.equal(platform.publicApi.value, null);
    else {
      assert.equal(platform.publicApi.status, "declared");
      assert.ok(platform.publicApi.sourceIds.includes("fiskaltrust-einvoicing-setup-20261101"));
    }
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
  assert.equal(pennylane.iso27001Scope.value?.validUntil, "2029-09-19");
  assert.equal(pennylane.iso27001Scope.value?.validFrom, "2026-09-20");
  assert.equal(pennylane.iso27001Scope.value?.validity, "valid");
  assert.ok(pennylane.iso27001Scope.sourceIds.includes("pennylane-iso27001-20261002"));
  const doxallia = researchForPlatform("doxallia").iso27001Scope;
  assert.equal(doxallia.value?.validity, "expired");
  assert.notEqual(doxallia.value?.validUntil, "2029-06-19");
  assert.ok(doxallia.sourceIds.includes("doxallia-hds-2026-09"));
  assert.equal(researchForPlatform("qonto").availability.eReporting.value?.stage, "beta");
  assert.equal(researchForPlatform("qonto").availability.eReporting.checkedAt, "2026-10-14");
  assert.ok(researchForPlatform("qonto").availability.eReporting.sourceIds.includes("qonto-invoicing-20261014"));
  assert.equal(platforms.find((platform) => platform.slug === "sage")!.pricing.checkedAt, "2026-08-25");
});

test("les déclarations Flowie laissent les dates et le périmètre ISO à confirmer", () => {
  const flowie = researchForPlatform("flowie");
  assert.equal(flowie.hostingProviders.status, "declared");
  assert.deepEqual(flowie.hostingProviders.value, ["S3NS"]);
  assert.equal(flowie.iso27001Scope.status, "declared");
  assert.equal(flowie.iso27001Scope.value?.evidenceKind, "renewal_statement");
  assert.equal(flowie.iso27001Scope.value?.validUntil, null);
  assert.equal(flowie.iso27001Scope.value?.validity, "not_published");
  assert.equal(flowie.iso27001Scope.value?.platformRelation, "not_established");
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
