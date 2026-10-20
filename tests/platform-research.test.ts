import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { platforms } from "../src/data/platforms.ts";
import { platformResearchProfiles, researchForPlatform } from "../src/data/platform-research.ts";
import { publicSiteObservations, TRACKER_RADAR_REVISION } from "../src/data/public-site-observations.ts";
import previousDirectory from "../docs/archives/official-directory-2026-10-10.json" with { type: "json" };

test("les 155 fiches ont un contrat de recherche fail-closed", () => {
  assert.equal(platformResearchProfiles.length, 155);
  assert.deepEqual(
    new Set(platformResearchProfiles.map((profile) => profile.platformSlug)),
    new Set(platforms.map((platform) => platform.slug)),
  );
  for (const profile of platformResearchProfiles) {
    const evidenceValues = [
      ...Object.values(profile.availability),
      profile.directImport,
      profile.overagePricing,
      profile.exitTerms,
      profile.terminationTerms,
      profile.hostingProviders,
      profile.declaredSubprocessors,
      profile.iso27001Scope,
    ];
    for (const evidence of evidenceValues) {
      if (evidence.value === null) {
        assert.equal(evidence.status, "non_documented", profile.platformSlug);
        assert.deepEqual(evidence.sourceIds, [], profile.platformSlug);
      } else {
        assert.notEqual(evidence.status, "non_documented", profile.platformSlug);
        assert.ok(evidence.sourceIds.length > 0, profile.platformSlug);
      }
    }
  }
});

test("les cas décisifs gardent leur limite exacte", () => {
  assert.equal(researchForPlatform("qonto").availability.eReporting.value?.stage, "beta");
  assert.match(researchForPlatform("superpdp").overagePricing.value ?? "", /0,01 € HT/);
  assert.equal(researchForPlatform("b2brouter").directImport.value?.acceptsThirdPartyFile, true);
  assert.equal(researchForPlatform("b2brouter").directImport.value?.preservesEmbeddedXml, null);
  assert.deepEqual(researchForPlatform("sellsy").hostingProviders.value, ["Scaleway"]);
  assert.ok((researchForPlatform("tiime").declaredSubprocessors.value?.length ?? 0) >= 10);
  assert.equal(researchForPlatform("doxallia").iso27001Scope.value?.platformRelation, "explicit_platform");
  assert.equal(researchForPlatform("doxallia").iso27001Scope.value?.validity, "expired");
  assert.equal(researchForPlatform("esker").iso27001Scope.value?.platformRelation, "service_family");
  assert.equal(researchForPlatform("esker").iso27001Scope.status, "declared");
});

test("les observations publiques couvrent tout le corpus sans fabriquer les fiches non scannées", () => {
  assert.match(TRACKER_RADAR_REVISION, /^[0-9a-f]{40}$/);
  assert.equal(publicSiteObservations.length, 155);
  assert.equal(publicSiteObservations.filter((observation) => observation.status === "observed").length, 11);
  for (const observation of publicSiteObservations) {
    if (observation.status === "observed") {
      assert.ok(observation.checkedAt);
      assert.ok(observation.finalUrl?.startsWith("https://"));
      for (const tracker of observation.trackers) {
        assert.ok(observation.thirdPartyDomains.includes(tracker.domain), `${observation.platformSlug}: ${tracker.domain}`);
        assert.ok(tracker.categories.length > 0, `${observation.platformSlug}: ${tracker.domain}`);
      }
    } else {
      assert.equal(observation.scanUrl, null);
      assert.equal(observation.checkedAt, null);
      assert.deepEqual(observation.trackers, []);
      assert.deepEqual(observation.thirdPartyDomains, []);
    }
  }
});

test("les observations de sites ne peuvent pas modifier le moteur de choix", async () => {
  const matcher = await readFile(new URL("../src/lib/matcher.ts", import.meta.url), "utf8");
  assert.doesNotMatch(matcher, /public-site-observations|tracker|thirdPartyDomains/i);
});

test("les six admissions récentes ne fabriquent pas une observation de site", () => {
  const previousNames = new Set(previousDirectory.approved.map((entry) => entry.name));
  const additions = platforms.filter((platform) => !previousNames.has(platform.officialName));
  assert.equal(additions.length, 6);
  for (const platform of additions) {
    const observation = publicSiteObservations.find((candidate) => candidate.platformSlug === platform.slug);
    assert.ok(observation, platform.slug);
    assert.equal(observation.status, "not_scanned", platform.slug);
    assert.equal(observation.checkedAt, null, platform.slug);
    assert.equal(observation.scanUrl, null, platform.slug);
    assert.equal(observation.finalUrl, null, platform.slug);
    assert.deepEqual(observation.trackers, [], platform.slug);
    assert.deepEqual(observation.thirdPartyDomains, [], platform.slug);
  }
});

test("Indy distingue une émission annoncée de la réception et de l’e-reporting documentés séparément", () => {
  const profile = researchForPlatform("indy");
  const platform = platforms.find(item => item.slug === "indy")!;
  assert.equal(platform.sendsInvoices.value, false);
  assert.equal(profile.availability.sendsInvoices.value?.stage, "announced");
  assert.equal(profile.availability.sendsInvoices.checkedAt, "2026-10-20");
  assert.equal(profile.availability.receivesInvoices.value?.stage, "available");
  assert.equal(profile.availability.eReporting.value?.stage, "available");
  assert.deepEqual(profile.availability.eReporting.sourceIds, ["indy-invoicing-2026"]);
});
