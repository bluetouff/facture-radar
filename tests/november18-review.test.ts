import assert from "node:assert/strict";
import test from "node:test";
import { incidentCoverage, incidentFeeds, platformIncidents, securityReview, incidentWatchCorpus } from "../src/data/incident-watch.ts";
import { platforms } from "../src/data/platforms.ts";

test("Divalto : reprise des accès sous surveillance et rattachement Docoon documenté séparément", () => {
  const event = platformIncidents.find(item => item.id === "divalto-security-20261112")!;
  assert.equal(event.kind, "security");
  assert.equal(event.scope, "connected_service");
  assert.deepEqual(event.platformSlugs, ["docoon"]);
  assert.equal(event.verification, "primary_notice");
  assert.equal(event.status, "monitoring");
  assert.equal(event.startedAt, null);
  assert.equal(event.resolutionReportedAt, null);
  assert.equal(event.updatedAt, "2026-11-18T14:50:00Z");
  assert.ok(event.relationship!.sourceIds.includes("divalto-docoon-integration-20261118"));
});

test("ConsonanceWeb : une application non identifiée reste hors des fiches PA", () => {
  const event = platformIncidents.find(item => item.id === "consonanceweb-security-20261117")!;
  assert.equal(event.scope, "ecosystem_service");
  assert.deepEqual(event.platformSlugs, []);
  assert.equal(event.affectedService, "Application ConsonanceWeb non nommée");
  assert.equal(event.verification, "relayed_notice");
  assert.equal(incidentWatchCorpus().sources.find(source => source.id === event.sourceIds[0])!.type, "press");
  assert.equal(event.status, "unknown");
  assert.equal(event.startedAt, null);
  assert.equal(event.firstReportedAt, "2026-11-17");
  assert.equal(event.updatedAt, "2026-11-18");
  assert.ok(event.relationship!.sourceIds.includes("consonanceweb-esalink-integration-20261118"));
});

test("AGENA : deux environnements distincts gardent une seule fiche de couverture", () => {
  const feeds = incidentFeeds.filter(feed => feed.platformSlugs.includes("agena3000"));
  assert.equal(feeds.length, 2);
  assert.equal(new Set(feeds.map(feed => feed.url)).size, 2);
  assert.equal(incidentCoverage.filter(item => item.platformSlug === "agena3000").length, 1);
  const events = platformIncidents.filter(item => item.id.startsWith("agena-edi-"));
  assert.equal(events.length, 3);
  assert.ok(events.every(event => event.scope === "publisher_service"));
  assert.ok(events.every(event => event.updatedAt! < "2026-11-01"));
});

test("Axonaut : le tarif par utilisateur et la revue PHP restent distincts d’une PA gratuite ou compromise", () => {
  const axonaut = platforms.find(item => item.slug === "axonaut")!;
  assert.equal(axonaut.pricing.value!.monthlyFrom, 97);
  assert.equal(axonaut.pricing.value!.unit, "user");
  assert.equal(axonaut.pricing.value!.kind, "included");
  const finding = securityReview.findings.find(item => item.platformSlug === "tradeshift")!;
  assert.equal(finding.type, "vulnerability_advisory");
  assert.ok(finding.sourceIds.includes("tradeshift-php-review-20261118"));
  assert.ok(!platformIncidents.some(event => event.kind === "security" && event.platformSlugs.includes("tradeshift")));
});
