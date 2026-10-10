import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { platformIncidents, validateIncidents, incidentsForPlatform, incidentWatchCorpus, incidentResearch, incidentFeeds, securityReview } from "../src/data/incident-watch.ts";
import { renderIncidentRss } from "../src/lib/incident-rss.ts";
import { SaxesParser } from "saxes";
import { parseWatchSource, watchSources, compareCandidates, FEED_LIMIT } from "../scripts/lib/incident-feeds.mjs";
import { getPlatform, getResourceByUri } from "../src/mcp/corpus.ts";
import directory from "../src/data/official-directory.json" with { type: "json" };
import { platforms } from "../src/data/platforms.ts";
import { researchForPlatform } from "../src/data/platform-research.ts";
import { matchPlatform } from "../src/lib/matcher.ts";
import { formatIncidentDate, incidentDateAfter } from "../src/lib/incident-dates.ts";

test("VosFactures : la notification relayée reste attribuée au prestataire", () => {
  const watch = incidentsForPlatform("vosfactures");
  assert.equal(watch.feeds.length, 0);
  assert.equal(watch.incidents.length, 2);
  const event = watch.incidents.find(item => item.kind === "security")!;
  assert.equal(event.kind, "security");
  assert.equal(event.scope, "upstream");
  assert.equal(event.verification, "relayed_notice");
  assert.equal(event.status, "investigating");
  assert.equal(event.startedAt, null);
  assert.equal(event.detectedAt, "2026-09-28");
  assert.equal(event.firstReportedAt, "2026-10-01");
  assert.equal(event.resolutionReportedAt, null);
  assert.match(event.affectedService!, /VosFactures.*Fakturownia/);
  assert.match(event.summary, /Factuali déclare épargnés les services de facturation électronique/);
  assert.match(event.summary, /invalidation des codes API est annoncée pour le 1er octobre/);
  assert.match(event.limitations, /bornes historiques des données polonaises/);
  assert.equal(platformIncidents.filter(item => item.scope === "pa").length, 13);
  assert.throws(() => validateIncidents([{ ...event, verification: "primary_notice" }]));
  for (const id of event.sourceIds) assert.ok(incidentWatchCorpus().sources.some(source => source.id === id));
  assert.deepEqual(getPlatform("vosfactures")!.incidentWatch.incidents, watch.incidents);
  const rss = renderIncidentRss([event]);
  assert.match(rss, /Notification relayée/);
  assert.match(rss, /Dépendance externe/);
  assert.match(rss, /Factuali déclare épargnés/);
  assert.ok(!rss.includes("<pubDate>"));
});

test("les avis manuels sont publiés pour Cecurity malgré l’absence de flux", () => {
  const watch = incidentsForPlatform("cecurity");
  assert.equal(watch.feeds.length, 0);
  assert.equal(watch.incidents.length, 3);
  assert.equal(watch.coverage.status, "partial");
  assert.deepEqual(getPlatform("cecurity")!.incidentWatch.incidents, watch.incidents);
  const security = watch.incidents.find(event => event.kind === "security")!;
  assert.equal(security.scope, "connected_service");
  assert.equal(security.affectedService, "Welyb / Portail AGIRIS CONNECT");
  assert.equal(security.verification, "relayed_notice");
  assert.equal(security.detectedAt, "2026-09-01");
  assert.equal(security.startedAt, null);
  for (const id of [...security.sourceIds, ...security.relationship!.sourceIds]) assert.ok(incidentWatchCorpus().sources.some(source => source.id === id));
  assert.throws(() => validateIncidents([{ ...security, verification: "primary_notice" }]));
  assert.throws(() => validateIncidents([{ ...security, affectedService: undefined }]));
  assert.throws(() => validateIncidents([{ ...security, relationship: undefined }]));
  assert.throws(() => validateIncidents([{ ...security, relationship: { note: "Lien supposé", sourceIds: security.sourceIds } }]));
  const xml = renderIncidentRss([security]);
  assert.match(xml, /Notification relayée/);
  assert.match(xml, /impact sur la PA Cecurity/);
  assert.match(xml, /frenchbreaches\.com/);
  assert.ok(!xml.includes("<pubDate>"));
});

test("la suspension AIFE reste un avis PA distinct de la fuite chez le prestataire", () => {
  const events = incidentsForPlatform("vosfactures").incidents;
  const security = events.find(event => event.kind === "security")!;
  const suspension = events.find(event => event.id === "vosfactures-aife-suspension-20261002")!;
  assert.equal(security.scope, "upstream");
  assert.equal(security.startedAt, null);
  assert.match(security.summary, /copie d’une grande partie de sa base/);
  assert.match(security.limitations, /extraction effective restent à préciser/);
  assert.equal(suspension.kind, "availability");
  assert.equal(suspension.scope, "pa");
  assert.equal(suspension.verification, "primary_notice");
  assert.equal(suspension.firstObservedAt, "2026-10-02");
  assert.equal(suspension.firstReportedAt, null);
  assert.equal(suspension.startedAt, "2026-10-01");
  assert.equal(suspension.status, "monitoring");
  assert.equal(suspension.updatedAt, null);
  assert.equal(suspension.resolutionReportedAt, null);
  const source = incidentWatchCorpus().sources.find(source => source.id === suspension.sourceIds[0])!;
  assert.equal(source.publisher, "AIFE");
  assert.equal(source.type, "institutional");
  assert.ok(directory.approved.some(entry => entry.name === "VosFactures"));
  assert.ok(!renderIncidentRss([suspension]).includes("<pubDate>"));
  assert.match(renderIncidentRss([suspension]), /Avis officiel/);
  assert.ok(platformIncidents.indexOf(suspension) < platformIncidents.findIndex(event => event.id === "welyb-cecurity-consultation-20260904"));
  assert.throws(() => validateIncidents([{ ...suspension, firstObservedAt: null, startedAt: null }]));
});

test("les avis Sage et Esker conservent les périmètres et les résolutions inconnues", () => {
  const sage = platformIncidents.find(event => event.id === "sage-kt4m889tbj9p")!;
  const esker = platformIncidents.find(event => event.id === "esker-response-e-20261001")!;
  assert.equal(sage.scope, "pa");
  assert.equal(sage.status, "resolved");
  assert.match(sage.summary, /E-Reporting/);
  assert.equal(esker.scope, "publisher_service");
  assert.equal(esker.status, "unknown");
  assert.equal(esker.updatedAt, "2026-10-01");
  assert.equal(sage.startedAt, null);
  assert.equal(sage.resolutionReportedAt, "2026-10-05T08:56:53Z");
  assert.equal(esker.startedAt, null);
  assert.equal(esker.resolutionReportedAt, null);
});

test("revue du 4 octobre : alertes regroupées et attribution limitée au service documenté", () => {
  const weproc = platformIncidents.find(event => event.id === "weproc-piste-20261003")!;
  assert.equal(weproc.scope, "upstream");
  assert.equal(weproc.status, "resolved");
  assert.equal(weproc.sourceIds.length, 7);
  assert.equal(weproc.startedAt, null);
  assert.match(weproc.limitations, /panne continue/);
  const myunisoft = platformIncidents.find(event => event.id === "myunisoft-connection-20261002")!;
  assert.equal(myunisoft.scope, "publisher_service");
  assert.equal(myunisoft.sourceIds.length, 2);
  assert.equal(myunisoft.status, "resolved");
  assert.equal(myunisoft.resolutionReportedAt, "2026-10-05");
  assert.match(myunisoft.limitations, /borne de fin de calendrier/);
  const esker = platformIncidents.find(event => event.id === "esker-interconnexion-pa-20261002")!;
  assert.equal(esker.scope, "pa");
  assert.equal(esker.status, "unknown");
  assert.equal(esker.resolutionReportedAt, null);
  assert.match(esker.summary, /5 octobre/);
  const fiducial = platformIncidents.find(event => event.id === "fiducial-client-onpremise-20261001")!;
  const welyb = platformIncidents.find(event => event.id === "welyb-acces-20261002")!;
  for (const event of [fiducial, welyb]) {
    assert.equal(event.scope, "ecosystem_service");
    assert.deepEqual(event.platformSlugs, []);
    assert.ok(platforms.every(platform => !incidentsForPlatform(platform.slug).incidents.includes(event)));
  }
  assert.equal(fiducial.verification, "primary_notice");
  assert.equal(fiducial.resolutionReportedAt, null);
  assert.equal(welyb.status, "resolved");
  assert.equal(platformIncidents.filter(event => event.kind === "security").length, 6);
});

test("nouvelles précisions de fiches : droits, portabilité et prix sans extrapolation", () => {
  assert.equal(platforms.find(platform => platform.slug === "macompta")!.accountantAccess.value, true);
  assert.match(researchForPlatform("ipaidthat").exitTerms.note!, /10 jours/);
  assert.equal(researchForPlatform("ipaidthat").exitTerms.value!.bulkExport, null);
  assert.equal(researchForPlatform("ipaidthat").exitTerms.value!.postTerminationAccess, null);
  const flowie = platforms.find(platform => platform.slug === "flowie")!;
  assert.equal(flowie.pricing.value!.monthlyFrom, null);
  assert.deepEqual(flowie.pricing.value!.freeFor, []);
  assert.match(flowie.pricing.note!, /24 par mois et 300 par an/);
});

test("dates au jour près, détection et résolution sans date restent fidèles à la source", () => {
  assert.equal(formatIncidentDate("2026-09-14"), "14 sept. 2026");
  assert.equal(formatIncidentDate(null), "Date non publiée");
  assert.match(formatIncidentDate("2026-09-14T10:30:00Z"), /12:30/);
  // An offset timestamp falling on the next Paris day must not escape the date check.
  assert.equal(incidentDateAfter("2026-09-16T23:30:00Z", "2026-09-16"), true);
  assert.equal(incidentDateAfter("2026-09-14T23:30:00+02:00", "2026-09-14"), false);
  const event = platformIncidents.find(event => event.id === "welyb-cecurity-consultation-20260904")!;
  assert.equal(event.status, "resolved");
  assert.equal(event.firstReportedAt, null);
  assert.equal(event.updatedAt, null);
  assert.equal(event.resolutionReportedAt, null);
  const xml = renderIncidentRss([event]);
  assert.ok(!xml.includes("<pubDate>"));
  assert.match(xml, /Date non publiée/);
  for (const change of [{ startedAt: "2026-09-31" }, { startedAt: "2026-08-01" }, { startedAt: null }, { detectedAt: "2026-09-02" }, { resolutionReportedAt: "2026-09-03" }, { updatedAt: "2026-10-11" }]) assert.throws(() => validateIncidents([{ ...event, ...change }]));
  const dated = platformIncidents.find(event => event.updatedAt?.includes("T"))!;
  assert.match(renderIncidentRss([dated]), /<pubDate>/);
});

test("les avis distinguent PA, application et dépendance sans durée inventée", () => {
  assert.equal(platformIncidents.length, 69);
  assert.equal(platformIncidents.filter(event => event.scope === "pa").length, 13);
  assert.equal(platformIncidents.find(event => event.id === "esker-french-b2b-20260915")!.status, "unknown");
  assert.equal(incidentsForPlatform("pennylane").incidents[0]!.scope, "publisher_service");
  assert.equal(platformIncidents.find(event => event.id === "welyb-cecurity-consultation-20260904")!.startedAt, "2026-09-04");
  assert.equal(incidentsForPlatform("abby").coverage.status, "not_reviewed");
  assert.equal(incidentsForPlatform("qonto").incidents.length, 0);
  assert.match(incidentsForPlatform("qonto").coverage.note, /reste à vérifier séparément/);
  assert.equal(incidentWatchCorpus().coverage.length, 149);
});

test("revue du 10 octobre : avis regroupés, onboarding et connecteur hors PA", () => {
  assert.ok(!platformIncidents.some(event => event.id === "sage-qm1bs54xn545"));
  const sageCoverage = incidentsForPlatform("sage").coverage;
  assert.ok(sageCoverage.sourceIds.some(id => id === "sage-onboarding-20261010"));
  assert.match(sageCoverage.note, /sans incident de service/);
  assert.ok(incidentWatchCorpus().sources.some(source => source.id === "sage-onboarding-20261010"));
  const esker = platformIncidents.find(event => event.id === "esker-affichage-20261009")!;
  assert.equal(esker.scope, "publisher_service");
  assert.equal(esker.sourceIds.length, 4);
  assert.equal(esker.status, "identified");
  assert.equal(esker.startedAt, null);
  assert.equal(esker.resolutionReportedAt, null);
  const connector = platformIncidents.find(event => event.id === "welyb-neoexpert-20261007")!;
  assert.equal(connector.scope, "ecosystem_service");
  assert.deepEqual(connector.platformSlugs, []);
  assert.equal(connector.firstReportedAt, "2026-10-07");
  assert.equal(connector.firstObservedAt, "2026-10-10");
  assert.ok(platforms.every(platform => !incidentsForPlatform(platform.slug).incidents.includes(connector)));
  const catchup = platformIncidents.find(event => event.id === "welyb-envois-20260925")!;
  assert.equal(catchup.status, "resolved");
  assert.equal(catchup.resolutionReportedAt, "2026-10-08");
  assert.equal(platformIncidents.filter(event => event.kind === "security").length, 6);
});

test("revue du 8 octobre : attribution France, services hors PA et résolution inconnue", () => {
  const invopop = platformIncidents.find(event => event.id === "invopop-documents-20261003")!;
  assert.equal(invopop.scope, "pa");
  assert.match(invopop.limitations, /API et la console sont restées accessibles/);
  const esker = platformIncidents.find(event => event.id === "esker-response-e-20261005")!;
  assert.equal(esker.status, "unknown");
  assert.equal(esker.resolutionReportedAt, null);
  assert.throws(() => validateIncidents([{ ...esker, resolutionReportedAt: "2026-10-08" }]));
  for (const id of ["welyb-ovh-20261007", "welyb-notifications-20261005", "chorus-pro-depot-pdf-20261006"]) {
    const event = platformIncidents.find(event => event.id === id)!;
    assert.equal(event.scope, "ecosystem_service");
    assert.deepEqual(event.platformSlugs, []);
    assert.throws(() => validateIncidents([{ ...event, platformSlugs: ["cecurity"] }]));
  }
  assert.equal(platformIncidents.find(event => event.id === "spendesk-3ds-20261007")!.kind, "availability");
  assert.ok(!platformIncidents.some(event => event.platformSlugs.includes("axonaut")));
  assert.equal(securityReview.findings.find(item => item.platformSlug === "axonaut")!.type, "outside_period");
});
test("chronologies et preuves d’incident invalides sont refusées", () => {
  const event = platformIncidents.find(event => event.id === "spendesk-einvoice-20260904")!;
  for (const change of [{ sourceIds: [] }, { sourceIds: ["inconnu"] }, { kind: "security" }, { platformSlugs: ["introuvable"] }, { firstReportedAt: "2026-09-20T00:00:00Z" }, { updatedAt: "2026-08-01T00:00:00Z" }, { status: "unknown" }, { scope: "all" }]) {
    assert.throws(() => validateIncidents([{ ...event, ...change }]));
  }
  assert.throws(() => validateIncidents([event, event]));
});
const source = watchSources[0];
const item = (link = "https://status.sage.com/incidents/abc123", date = "Tue, 15 Sep 2026 10:00:00 +0000") => `<item><title>Service</title><link>${link}</link><pubDate>${date}</pubDate><description><![CDATA[<p>Update</p>]]></description></item>`;
const rss = (body: string) => `<rss><channel>${body}</channel></rss>`;
const now = Date.parse("2026-09-16T12:00:00Z");
test("Statuspage : les maintenances explicites restent hors des incidents, même avec un titre libre", () => {
  // Reduced entries from the failing GitHub collection of 24 September 2026.
  const schedules = [
    { sourceId: "axway", title: "AMPLIFY FUSION &amp; STUDIO — UPGRADE TO 1.18 (EU Region)", url: "https://status.axway.com/incidents/kj65th1wdrdj", start: "Wed, 07 Oct 2026 17:00:00 +0000", end: "Wed, 07 Oct 2026 19:00:00 +0000" },
    { sourceId: "pitney-bowes", title: "USPS APIs Maintenance", url: "https://status.pitneybowes.com/incidents/wqws4q2vk9cv", start: "Thu, 24 Sep 2026 21:00:00 -0400", end: "Fri, 25 Sep 2026 01:00:00 -0400" },
    // The next day's completed notice uses pubDate for an update after maintenanceEndDate.
    { sourceId: "pitney-bowes", title: "USPS APIs Maintenance", url: "https://status.pitneybowes.com/incidents/wqws4q2vk9cv", start: "Fri, 25 Sep 2026 01:00:15 -0400", end: "Fri, 25 Sep 2026 01:00:00 -0400" },
  ];
  for (const schedule of schedules) {
    const feed = watchSources.find(feed => feed.id === schedule.sourceId)!;
    const maintenance = `<item><title>${schedule.title}</title><link>${schedule.url}</link><pubDate>${schedule.start}</pubDate><maintenanceEndDate>${schedule.end}</maintenanceEndDate><description>Planned upgrade</description></item>`;
    const incident = item(new URL("/incidents/real123", feed.url).href);
    for (const date of ["2026-09-24T11:54:50.173Z", "2026-10-08T12:00:00Z"]) {
      const checkedAt = Date.parse(date);
      const expected = parseWatchSource(feed, rss(incident), checkedAt);
      assert.equal(expected.length, 1);
      assert.deepEqual(parseWatchSource(feed, rss(maintenance), checkedAt), []);
      assert.deepEqual(parseWatchSource(feed, rss(maintenance + incident), checkedAt), expected);
      assert.deepEqual(parseWatchSource(feed, rss(incident + maintenance), checkedAt), expected);
    }
  }
});

test("Statuspage : un incident futur ou une maintenance mal formée restent des erreurs", () => {
  const future = item(undefined, "Wed, 07 Oct 2026 17:00:00 +0000");
  const marked = (end: string) => future.replace("</item>", `<maintenanceEndDate>${end}</maintenanceEndDate></item>`);
  assert.throws(() => parseWatchSource(source, rss(future), now), /Date de flux invalide/);
  for (const end of ["", "not-a-date UTC", "2026-10-07T19:00:00"]) {
    assert.throws(() => parseWatchSource(source, rss(marked(end)), now));
  }
  const valid = marked("Wed, 07 Oct 2026 19:00:00 +0000");
  assert.throws(() => parseWatchSource(source, rss(valid.replace("Wed, 07 Oct 2026 17:00:00 +0000", "not-a-date UTC")), now));
  assert.throws(() => parseWatchSource(source, rss(valid.replace("status.sage.com", "localhost")), now));
  assert.throws(() => parseWatchSource(source, rss(valid.replace("</item>", "<maintenanceEndDate>Wed, 07 Oct 2026 19:00:00 +0000</maintenanceEndDate></item>")), now));
  // A Statuspage-specific field cannot suppress incidents from another provider.
  const other = watchSources.find(feed => feed.id === "weproc")!;
  assert.throws(() => parseWatchSource(other, rss(valid.replace("https://status.sage.com/incidents/abc123", "https://status.weinvoice.fr/incident/123")), now), /Date de flux invalide/);
});

test("Oh Dear conserve les avis distincts ayant le même lien racine", () => {
  const feed = watchSources.find(feed => feed.id === "superpdp")!;
  const opened = item("https://status.superpdp.tech", "2026-09-18T11:32:00+00:00");
  const closed = item("https://status.superpdp.tech", "2026-09-18T14:01:00+00:00").replace("Update", "Resolved");
  const current = Date.parse("2026-09-20T12:00:00Z");
  const notices = parseWatchSource(feed, rss(opened + closed), current);
  assert.equal(notices.length, 2);
  assert.notEqual(notices[0].id, notices[1].id);
  assert.deepEqual(parseWatchSource(feed, rss(closed + opened), current), [...notices].reverse());
  assert.equal(compareCandidates(Object.fromEntries(notices.map(n => [n.id, n])), notices).length, 0);
  const changed = parseWatchSource(feed, rss(closed.replace("Resolved", "Amended")), current);
  assert.equal(changed[0].id, notices[1].id);
  assert.equal(compareCandidates({ [notices[1].id]: notices[1] }, changed)[0].change, "updated");
  for (const link of ["https://localhost/", "https://status.superpdp.tech.evil.example/", "https://status.superpdp.tech/?next=evil", "https://status.superpdp.tech/#fragment", "https://status.superpdp.tech/admin", "https://user:pass@status.superpdp.tech/"]) assert.throws(() => parseWatchSource(feed, rss(item(link)), current));
  assert.throws(() => parseWatchSource(source, rss(item("https://status.sage.com/")), current));
  assert.throws(() => parseWatchSource(feed, rss(closed + closed.replace("Resolved", "Conflicting")), current));
});

test("Zenfirst reste hors des fiches PA et sa revendication demeure qualifiée dans le RSS et le MCP", () => {
  const event = platformIncidents.find(event => event.id === "zenfirst-claim-20260917")!;
  assert.equal(event.scope, "ecosystem_service");
  assert.equal(event.verification, "reported_claim");
  assert.deepEqual(event.platformSlugs, []);
  assert.equal(event.affectedService, "Zenfirst");
  assert.equal(event.startedAt, null);
  assert.ok(platforms.every(platform => !incidentsForPlatform(platform.slug).incidents.includes(event)));
  const corpus = incidentWatchCorpus();
  assert.equal(corpus.incidents.find(item => item.id === event.id)?.verification, "reported_claim");
  for (const change of [{ platformSlugs: ["cecurity"] }, { affectedService: undefined }, { verification: "primary_notice" }, { status: "resolved" }, { scope: "pa" }]) assert.throws(() => validateIncidents([{ ...event, ...change }]));
  const xml = renderIncidentRss([event]);
  assert.match(xml, /Revendication non confirmée/);
  assert.match(xml, /Service hors annuaire PA/);
  assert.match(xml, /impact sur une PA est non documenté/);
  assert.ok(!xml.includes("<pubDate>"));
});

test("émission Abby annoncée et renouvellement documentaire Pennylane confirmé", () => {
  assert.equal(platforms.find(p => p.slug === "abby")!.sendsInvoices.value, false);
  assert.equal(researchForPlatform("abby").availability.sendsInvoices.value?.stage, "announced");
  assert.equal(platforms.find(p => p.slug === "abby")!.eReporting.value, null);
  assert.equal(researchForPlatform("pennylane").iso27001Scope.value?.validity, "valid");
  assert.equal(platforms.find(p => p.slug === "pennylane")!.iso27001.status, "documented");
  assert.equal(platformIncidents.find(e => e.id === "spendesk-transfers-20260916")!.status, "resolved");
  assert.equal(platformIncidents.find(e => e.id === "tungsten-support-20260916")!.status, "resolved");
  const superpdp = platformIncidents.find(e => e.id === "superpdp-directory-20260918")!;
  assert.equal(superpdp.resolutionReportedAt, "2026-09-18");
  assert.match(superpdp.limitations, /fuseaux différents/);
  assert.equal(incidentFeeds.find(feed => feed.id === "docoon")!.url, "https://docooninvoice.statuspage.io/history.rss");
});

test("collecte bornée, sources autorisées et XML sans entités externes", () => {
  assert.equal(parseWatchSource(source, rss(item()), now).length, 1);
  for (const body of ["<!DOCTYPE rss [<!ENTITY x SYSTEM 'file:///etc/passwd'>]>" + rss(item()), rss(item("http://127.0.0.1/incidents/abc")), rss(item("https://status.sage.com.evil.example/incidents/abc")), rss(item()+item()), rss(item(undefined,"Fri, 18 Sep 2026 10:00:00 +0000")), "<rss>", "x".repeat(FEED_LIMIT+1)]) assert.throws(() => parseWatchSource(source, body, now));
  assert.throws(() => parseWatchSource({ ...source, url: "https://localhost/" }, rss(item()), now));
  assert.equal(parseWatchSource(source, rss(item(undefined,"Sat, 01 Aug 2026 10:00:00 +0000")), now).length, 0);
  assert.throws(() => parseWatchSource(watchSources[2], "<html>Access denied</html>"));
});
test("une mise à jour est détectée sans répéter un avis inchangé", () => {
  const [candidate] = parseWatchSource(source, rss(item()), now);
  assert.equal(compareCandidates({}, [candidate])[0].change, "new");
  assert.equal(compareCandidates({[candidate.id]: candidate}, [candidate]).length, 0);
  assert.equal(compareCandidates({[candidate.id]: {...candidate, fingerprint: "old"}}, [candidate])[0].change, "updated");
});
test("API et MCP présentent incidents, couverture et mêmes sources", () => {
  const result = getResourceByUri("pacheck://corpus/incidents", {revision:"test",builtAt:"2026-09-16"}) as ReturnType<typeof incidentWatchCorpus>;
  assert.equal(result.incidents.length, 69);
  assert.deepEqual(getPlatform("esker")!.incidentWatch.incidents, incidentsForPlatform("esker").incidents);
});

test("Altagem est attribué au service connecté et Faktus reste hors des fiches PA", () => {
  const event = platformIncidents.find(event => event.id === "altagem-claim-20260921")!;
  assert.deepEqual(event.platformSlugs, ["iopole"]);
  assert.equal(event.scope, "connected_service");
  assert.equal(event.affectedService, "Altagem");
  assert.equal(event.verification, "reported_claim");
  assert.equal(event.status, "unknown");
  assert.equal(event.startedAt, null);
  assert.equal(event.resolutionReportedAt, null);
  assert.deepEqual(event.relationship!.sourceIds, ["altagem-iopole-integration-20260923"]);
  assert.match(event.limitations, /impact sur la PA Iopole.*non établi/);
  assert.throws(() => validateIncidents([{ ...event, verification: "primary_notice" }]));
  assert.throws(() => validateIncidents([{ ...event, relationship: undefined }]));
  assert.throws(() => validateIncidents([{ ...event, status: "resolved" }]));
  const xml = renderIncidentRss([event]);
  assert.match(xml, /Revendication non confirmée/);
  assert.match(xml, /impact sur la PA Iopole/);
  assert.deepEqual(getPlatform("iopole")!.incidentWatch.incidents, incidentsForPlatform("iopole").incidents);
  const faktus = platformIncidents.find(event => event.id === "faktus-claim-20260919")!;
  assert.equal(faktus.scope, "ecosystem_service");
  assert.equal(faktus.verification, "reported_claim");
  assert.deepEqual(faktus.platformSlugs, []);
  assert.ok(platforms.every(platform => !incidentsForPlatform(platform.slug).incidents.includes(faktus)));
});

test("le retrait du message Esker conserve la dernière date publiée sans inventer une résolution", () => {
  const event = platformIncidents.find(event => event.id === "esker-french-b2b-20260915")!;
  assert.equal(event.status, "unknown");
  assert.equal(event.resolutionReportedAt, null);
  assert.equal(event.updatedAt, "2026-09-15T12:15:00Z");
  assert.equal(event.checkedAt, "2026-10-10");
});

test("avis non daté : observation distincte de la publication et attribution au service connecté", () => {
  const event = platformIncidents.find(event => event.id === "welyb-jefacture-statuts-20260930")!;
  assert.equal(event.scope, "connected_service");
  assert.deepEqual(event.platformSlugs, ["jefacture"]);
  assert.equal(event.firstObservedAt, "2026-09-30");
  assert.equal(event.firstReportedAt, null);
  assert.equal(event.updatedAt, null);
  assert.equal(event.startedAt, null);
  assert.equal(event.status, "unknown");
  const xml = renderIncidentRss([event]);
  assert.match(xml, /Première observation par PA Check/);
  assert.ok(!xml.includes("<pubDate>"));
  assert.deepEqual(getPlatform("jefacture")!.incidentWatch.incidents.find(item => item.id === event.id), event);
  for (const change of [{ firstObservedAt: null }, { firstObservedAt: "2026-10-11" }, { firstObservedAt: "2026-08-30" }, { firstObservedAt: "2026-09-31" }, { firstReportedAt: "2026-08-01" }, { relationship: undefined }]) {
    assert.throws(() => validateIncidents([{ ...event, ...change }]));
  }
});

test("revue du 30 septembre : résolutions sourcées et retraits Esker distincts", () => {
  const spendesk = platformIncidents.find(event => event.id === "spendesk-france-20260922")!;
  assert.equal(spendesk.status, "resolved");
  assert.equal(spendesk.resolutionReportedAt, "2026-09-23T10:34:08Z");
  assert.equal(spendesk.startedAt, null);
  assert.equal(platformIncidents.find(event => event.id === "spendesk-amazon-20260916")!.status, "resolved");
  assert.equal(platformIncidents.find(event => event.id === "welyb-cloture-20260922")!.resolutionReportedAt, "2026-09-24");
  const esker = platformIncidents.find(event => event.id === "esker-documents-j-20260929")!;
  assert.equal(esker.status, "unknown");
  assert.equal(esker.scope, "publisher_service");
  assert.equal(esker.updatedAt, "2026-09-29T21:38:00Z");
  assert.equal(esker.resolutionReportedAt, null);
  assert.ok(!incidentsForPlatform("qonto").incidents.some(event => event.id === "welyb-envois-20260925"));
  assert.equal(incidentWatchCorpus().schemaVersion, "2.2");
});

test("chaque PA a une recherche datée ; collecte et incidents restent distincts", () => {
  assert.equal(incidentResearch.length, 149);
  assert.deepEqual([...incidentResearch.map(item => item.platformSlug)].sort(), platforms.map(item => item.slug).sort());
  assert.equal(incidentFeeds.length, 26);
  assert.equal(incidentWatchCorpus().collection.intervalMinutes, 1440);
  assert.equal(incidentsForPlatform("abby").security.status, "public_search_completed");
  assert.equal(incidentsForPlatform("weproc").incidents.length, 5);
  assert.equal(incidentsForPlatform("spendesk").incidents.filter(event => event.scope === "pa").length, 2);
  assert.equal(platformIncidents.filter(event => event.kind === "security").length, 6);
  assert.ok(incidentWatchCorpus().securityReview.findings.every(finding => ["outside_period", "vulnerability_advisory"].includes(finding.type)));
});

test("les mises à jour Better Stack se regroupent indépendamment de l’ordre du flux", () => {
  const feed = watchSources.find(feed => feed.id === "weproc")!;
  const old = item("https://status.weinvoice.fr/incident/123", "Tue, 01 Sep 2026 09:00:00 +0000");
  const newer = item("https://status.weinvoice.fr/incident/123", "Tue, 01 Sep 2026 10:00:00 +0000").replace("Update", "Resolved");
  const first = parseWatchSource(feed, rss(old + newer), now);
  assert.deepEqual(first, parseWatchSource(feed, rss(newer + old), now));
  assert.equal(first.length, 1);
  assert.match(first[0].content, /Resolved/);
  assert.equal(first[0].publishedAt, "2026-09-01T10:00:00.000Z");
  assert.throws(() => parseWatchSource(feed, rss(newer + newer.replace("Resolved", "Contradictory")), now));
});

test("Atom : fuseau, origine, entités et contenu obligatoires", () => {
  const feed = watchSources.find(feed => feed.id === "veryswing")!;
  const atom = '<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Test</title><link rel="alternate" href="https://status.veryswing.com/incident/123/"/><updated>2026-09-15T09:00:00Z</updated><summary type="html">Message</summary></entry></feed>';
  assert.equal(parseWatchSource(feed, atom, now).length, 1);
  assert.throws(() => parseWatchSource(feed, atom.replace("status.veryswing.com", "localhost"), now));
  assert.throws(() => parseWatchSource(feed, atom.replace("09:00:00Z", "09:00:00"), now));
  assert.throws(() => parseWatchSource(feed, '<!DOCTYPE feed>' + atom, now));
});

test("API JSON : schéma, fenêtre et chronologie vérifiés avant intégration", () => {
  const feed = watchSources.find(feed => feed.id === "myunisoft")!;
  const row = { id: "02da09f4-55ea-4a25-9b80-779a7eef0939", title: "Connexion", start: "2026-09-16T09:00:00Z", end: null, url: "/incident/02da09f4-55ea-4a25-9b80-779a7eef0939/" };
  const [open] = parseWatchSource(feed, JSON.stringify([row]), now);
  const closed = parseWatchSource(feed, JSON.stringify([{ ...row, end: "2026-09-16T10:00:00Z" }]), now);
  assert.equal(compareCandidates({ [open.id]: open }, closed)[0].change, "updated");
  for (const bad of [{ ...row, url: "http://127.0.0.1/" }, { ...row, end: "2026-09-15T10:00:00Z" }, { ...row, id: "wrong" }]) assert.throws(() => parseWatchSource(feed, JSON.stringify([bad]), now));
  const robot = watchSources.find(feed => feed.id === "tiime")!;
  const empty = { status: true, results: [], meta: { count: 0, date_range: { from: "2026-08-17T12:00:00Z", to: "2026-09-16T12:00:00Z" } } };
  assert.deepEqual(parseWatchSource(robot, JSON.stringify(empty), now), []);
  assert.throws(() => parseWatchSource(robot, JSON.stringify({ ...empty, status: false }), now));
  assert.throws(() => parseWatchSource(robot, JSON.stringify(empty), now + 48 * 3600_000));
  assert.throws(() => parseWatchSource({ ...feed, profile: "statuspage" }, rss(item()), now));
});

test("MyUnisoft : une fin de calendrier future reste une borne, sans publication future", () => {
  const feed = watchSources.find(feed => feed.id === "myunisoft")!;
  const collectedAt = Date.parse("2026-10-03T11:46:43Z");
  const row = { id: "fba23613-5912-4c1f-a6f9-28aa0c690859", title: "Problème de connexion", start: "2026-10-02T13:55:55+00:00", end: "2026-10-03T23:59:59+00:00", url: "/incident/fba23613-5912-4c1f-a6f9-28aa0c690859/" };
  const [notice] = parseWatchSource(feed, JSON.stringify([row]), collectedAt);
  assert.equal(notice.publishedAt, "2026-10-02T13:55:55.000Z");
  assert.equal(JSON.parse(notice.content).calendarEnd, "2026-10-03T23:59:59.000Z");
  for (const bad of [
    { ...row, start: "2026-10-04T00:00:00Z" },
    { ...row, end: "2026-10-03T23:59:59" },
    { ...row, end: "not-a-dateZ" },
    { ...row, end: "2026-10-01T23:59:59Z" },
  ]) assert.throws(() => parseWatchSource(feed, JSON.stringify([bad]), collectedAt));
  assert.throws(() => parseWatchSource(feed, JSON.stringify([row, row]), collectedAt), /Identifiant calendrier invalide/);
});

test("CERT-FR fournit une piste de vulnérabilité, et le RSS public échappe le texte", () => {
  const feed = watchSources.find(feed => feed.id === "cert-fr")!;
  const notice = parseWatchSource(feed, rss(item("https://www.cert.ssi.gouv.fr/avis/CERTFR-2026-AVI-1134/")), now);
  assert.equal(notice.length, 1);
  assert.throws(() => parseWatchSource(feed, rss(item("https://www.cert.ssi.gouv.fr/../api/secrets")), now));
  const xml = renderIncidentRss([{ ...platformIncidents[0]!, title: '<script>x</script> & "test"', summary: 'Texte ]]> & fin' }]);
  new SaxesParser().write(xml).close();
  assert.ok(!xml.includes("<script>"));
  assert.match(xml, /&lt;script&gt;/);
});
test("relevé du 23 septembre : contact Shine actualisé et aucune admission déduite d’une disparition", async () => {
  const prior = JSON.parse(await readFile(new URL("../docs/archives/official-directory-2026-09-14.json",import.meta.url),"utf8"));
  assert.equal(directory.approved.length, prior.approved.length);
  assert.equal(directory.pending.length, 14);
  assert.deepEqual(prior.pending.filter((entry: {name:string}) => !directory.pending.some(item => item.name === entry.name)).map((entry:{name:string})=>entry.name).sort(),["NUMERIA","WAKASTELLAR"]);
  assert.equal(directory.approved.find(item => item.name === "DOKAPI")!.contact,"support_pa@dokapi.io");
  assert.equal(directory.sourcePageUpdatedAt,"2026-09-22");
  assert.equal(directory.snapshotDate,"2026-10-10");
  assert.equal(directory.approved.find(item => item.name === "Shine")!.contact,"pa@shine.co");
});
test("Sellsy non disponible en e-reporting, Abby API payante, portabilité Qonto distincte de l’export", () => {
  const sellsy = platforms.find(platform => platform.slug === "sellsy")!;
  assert.equal(sellsy.eReporting.value,false);
  assert.equal(researchForPlatform("sellsy").availability.eReporting.value?.stage,"announced");
  assert.equal(matchPlatform(sellsy,{size:"tpe",monthlyInvoices:10,freeOnly:false,noBankAccount:false,needsAccountantAccess:false,needsApi:false,needsInternationalReporting:true}).eligible,false);
  assert.equal(platforms.find(platform => platform.slug === "abby")!.publicApi.value?.includedInFree,false);
  assert.equal(researchForPlatform("qonto").exitTerms.value,null);
  assert.match(researchForPlatform("qonto").terminationTerms.value!,/après confirmation/);
});

test("maintenances exclues et retrait d’un avis Esker soumis à revue", () => {
  assert.equal(parseWatchSource(source, rss(item(undefined,"Fri, 18 Sep 2026 10:00:00 +0000").replace("Service", "Scheduled Maintenance")), now).length, 0);
  assert.equal(parseWatchSource(source, rss(item().replace("Service", "Unexpected outage after maintenance")), now).length, 1);
  const shell = '<div class="tower_detail" id="detail_tower_G"><h3>Service availability</h3>';
  const empty = parseWatchSource(watchSources[2], shell+'<div class="status_container"></div>');
  assert.equal(empty[0].noticeVisible,false);
  const active = parseWatchSource(watchSources[2], shell+"<div class='message message_ProductionIncident_orange'><p>Incident</p></div>"+'<div class="status_container"></div>');
  const changes = compareCandidates({[active[0].id]:active[0]},empty);
  assert.equal(changes.length,1);
  assert.match(changes[0].content,/ne prouve pas une résolution/);
});
