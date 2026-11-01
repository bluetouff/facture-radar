import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import directory from "../src/data/official-directory.json" with { type: "json" };
import { platforms } from "../src/data/platforms.ts";
import { incidentResearch, incidentWatchCorpus, platformIncidents } from "../src/data/incident-watch.ts";
import { publicSiteObservations } from "../src/data/public-site-observations.ts";

test("Swile : admission officielle à date inconnue, DocProcess conservé en historique", async () => {
  const swile = platforms.find(p => p.slug === "swile")!;
  assert.equal(swile.officialStatus.status, "official");
  assert.equal(swile.registeredAt.value, "En attente");
  assert.deepEqual(swile.registeredAt.sourceIds, ["dgfip-list-20261101"]);
  for (const evidence of [swile.sendsInvoices, swile.receivesInvoices, swile.eReporting, swile.publicApi, swile.pricing]) assert.equal(evidence.value, null);
  assert.equal(publicSiteObservations.find(p => p.platformSlug === "swile")!.status, "not_scanned");
  assert.ok(!directory.pending.some(p => p.name === "SWILE"));
  assert.ok(!platforms.some(p => p.slug === "docprocess"));
  assert.match(await readFile(new URL("../src/pages/plateformes/docprocess.astro", import.meta.url), "utf8"), /Le fichier ne donne pas le motif/);
  assert.equal(platforms.find(p => p.slug === "atgp")!.officialName, "@GP");
  assert.equal(incidentResearch.length, 155);
});
test("les prévisions et les composants France ne deviennent pas des résolutions PA", () => {
  const pagero = platformIncidents.find(e => e.id === "pagero-ppf-20261101")!;
  assert.equal(pagero.status, "identified");
  assert.equal(pagero.scope, "upstream");
  assert.equal(pagero.resolutionReportedAt, null);
  assert.match(pagero.limitations, /prévision/);
  const eezi = platformIncidents.find(e => e.id === "eezi-cmvtfjan50b0f0wqg1p2oook7")!;
  assert.equal(eezi.scope, "publisher_service");
  assert.match(eezi.limitations, /rattachement exact à la PA reste à documenter/);
  const api = platformIncidents.find(e => e.id === "superpdp-network-20261030")!;
  assert.equal(api.firstReportedAt, "2026-10-30");
  assert.equal(api.resolutionReportedAt, "2026-10-30");
  assert.match(api.limitations, /contradiction/);
});
test("fulll : reprise PA séparée des applications et des séquences SQL", () => {
  const pa = platformIncidents.find(e => e.id === "fulll-1097346")!;
  const applications = platformIncidents.find(e => e.id === "fulll-1097775")!;
  assert.equal(pa.scope, "pa");
  assert.equal(pa.resolutionReportedAt, "2026-10-21T18:01:00Z");
  assert.equal(applications.scope, "publisher_service");
  assert.match(applications.limitations, /Aucune notification explicite de retour de Caisse/);
  assert.match(platformIncidents.find(e => e.id === "fulll-1106620")!.limitations, /ne décrit pas une interruption continue/);
});
test("les références de couverture et de recherche sont présentes dans le corpus public", () => {
  const corpus = incidentWatchCorpus();
  const sourceIds = new Set(corpus.sources.map(s => s.id));
  for (const section of [...corpus.coverage, ...corpus.securityReview.findings]) {
    for (const id of section.sourceIds) assert.ok(sourceIds.has(id), id);
  }
});
