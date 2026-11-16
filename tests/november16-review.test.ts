import assert from "node:assert/strict";
import test from "node:test";
import { incidentCoverage, platformIncidents } from "../src/data/incident-watch.ts";
import { platforms } from "../src/data/platforms.ts";

test("Maileva : confirmation de novembre, date d’attaque inconnue et aucune attribution à une PA", () => {
  const event = platformIncidents.find(item => item.id === "maileva-security-confirmation-20261115")!;
  assert.equal(event.scope, "ecosystem_service");
  assert.deepEqual(event.platformSlugs, []);
  assert.equal(event.verification, "primary_notice");
  assert.equal(event.updatedAt, "2026-11-15");
  assert.equal(event.firstObservedAt, "2026-11-16");
  assert.equal(event.firstReportedAt, null);
  assert.equal(event.startedAt, null);
  assert.equal(event.resolutionReportedAt, null);
  assert.equal(event.status, "unknown");
  assert.ok(event.sourceIds.includes("laposte-maileva-20261115"));
});

test("Cecurity : les six rattrapages gardent leur période historique", () => {
  const historical = platformIncidents.filter(item => item.id.startsWith("cecurity-") && item.scope === "pa");
  assert.equal(historical.length, 6);
  assert.ok(historical.every(item => item.updatedAt! < "2026-11-01"));
  assert.ok(historical.every(item => item.firstObservedAt === "2026-11-16"));
  for (const id of ["cecurity-4cj1y96440xl", "cecurity-n1tp3ns7qq2r"]) {
    assert.equal(historical.find(item => item.id === id)!.startedAt, null);
  }
  const connector = platformIncidents.find(item => item.id === "welyb-cecurity-recuperation-20261014")!;
  assert.equal(connector.scope, "connected_service");
  assert.equal(connector.resolutionReportedAt, "2026-10-29");
});

test("la nouvelle collecte fulll conserve une seule couverture et les dates officielles de Basikon", () => {
  assert.equal(new Set(incidentCoverage.map(item => item.platformSlug)).size, incidentCoverage.length);
  assert.equal(incidentCoverage.filter(item => item.platformSlug === "fulll").length, 1);
  assert.ok(incidentCoverage.find(item => item.platformSlug === "fulll")!.sourceIds.some(id => id === "fulll-status-20261116"));
  for (const sourceId of ["fulll-incident-1097346-20261101", "fulll-incident-1089867-20261101"]) {
    assert.ok(incidentCoverage.find(item => item.platformSlug === "fulll")!.sourceIds.includes(sourceId));
  }
  const basikon = platforms.find(item => item.slug === "basikon")!;
  assert.equal(basikon.registeredAt.value, "2026-11-09");
  assert.equal(basikon.registeredAt.checkedAt, "2026-11-16");
});
