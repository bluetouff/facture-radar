import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { platformIncidents, validateIncidents, incidentsForPlatform, incidentWatchCorpus, incidentResearch, incidentFeeds } from "../src/data/incident-watch.ts";
import { renderIncidentRss } from "../src/lib/incident-rss.ts";
import { SaxesParser } from "saxes";
import { parseWatchSource, watchSources, compareCandidates, FEED_LIMIT } from "../scripts/lib/incident-feeds.mjs";
import { getPlatform, getResourceByUri } from "../src/mcp/corpus.ts";
import directory from "../src/data/official-directory.json" with { type: "json" };
import { platforms } from "../src/data/platforms.ts";
import { researchForPlatform } from "../src/data/platform-research.ts";
import { matchPlatform } from "../src/lib/matcher.ts";

test("les avis distinguent PA, application et dépendance sans durée inventée", () => {
  assert.equal(platformIncidents.length, 23);
  assert.equal(platformIncidents.filter(event => event.scope === "pa").length, 6);
  assert.equal(platformIncidents.find(event => event.id === "esker-french-b2b-20260915")!.status, "monitoring");
  assert.equal(incidentsForPlatform("pennylane").incidents[0]!.scope, "publisher_service");
  assert.ok(platformIncidents.every(event => event.startedAt === null));
  assert.equal(incidentsForPlatform("abby").coverage.status, "not_reviewed");
  assert.equal(incidentsForPlatform("qonto").incidents.length, 0);
  assert.match(incidentsForPlatform("qonto").coverage.note, /reste à vérifier séparément/);
  assert.equal(incidentWatchCorpus().coverage.length, 149);
});
test("chronologies et preuves d’incident invalides sont refusées", () => {
  const event = platformIncidents.find(event => event.status === "resolved")!;
  for (const change of [{ sourceIds: [] }, { sourceIds: ["inconnu"] }, { kind: "security" }, { platformSlugs: ["introuvable"] }, { firstReportedAt: "2026-09-20T00:00:00Z" }, { updatedAt: "2026-08-01T00:00:00Z" }, { resolutionReportedAt: null }, { scope: "all" }]) {
    assert.throws(() => validateIncidents([{ ...event, ...change }]));
  }
  assert.throws(() => validateIncidents([event, event]));
});
const source = watchSources[0];
const item = (link = "https://status.sage.com/incidents/abc123", date = "Tue, 15 Sep 2026 10:00:00 +0000") => `<item><title>Service</title><link>${link}</link><pubDate>${date}</pubDate><description><![CDATA[<p>Update</p>]]></description></item>`;
const rss = (body: string) => `<rss><channel>${body}</channel></rss>`;
const now = Date.parse("2026-09-16T12:00:00Z");
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
  assert.equal(result.incidents.length, 23);
  assert.deepEqual(getPlatform("esker")!.incidentWatch.incidents, incidentsForPlatform("esker").incidents);
});

test("chaque PA a une recherche datée ; collecte et incidents restent distincts", () => {
  assert.equal(incidentResearch.length, 149);
  assert.deepEqual([...incidentResearch.map(item => item.platformSlug)].sort(), platforms.map(item => item.slug).sort());
  assert.equal(incidentFeeds.length, 26);
  assert.equal(incidentWatchCorpus().collection.intervalMinutes, 1440);
  assert.equal(incidentsForPlatform("abby").security.status, "public_search_completed");
  assert.equal(incidentsForPlatform("weproc").incidents.length, 2);
  assert.equal(incidentsForPlatform("spendesk").incidents.filter(event => event.scope === "pa").length, 1);
  assert.equal(platformIncidents.filter(event => event.kind === "security").length, 0);
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
test("relevé du 16 septembre : aucune admission déduite d’une disparition", async () => {
  const prior = JSON.parse(await readFile(new URL("../docs/archives/official-directory-2026-09-14.json",import.meta.url),"utf8"));
  assert.equal(directory.approved.length, prior.approved.length);
  assert.equal(directory.pending.length, 14);
  assert.deepEqual(prior.pending.filter((entry: {name:string}) => !directory.pending.some(item => item.name === entry.name)).map((entry:{name:string})=>entry.name).sort(),["NUMERIA","WAKASTELLAR"]);
  assert.equal(directory.approved.find(item => item.name === "DOKAPI")!.contact,"support_pa@dokapi.io");
  assert.equal(directory.sourcePageUpdatedAt,"2026-09-10");
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
