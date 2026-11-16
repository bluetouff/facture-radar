import assert from "node:assert/strict";
import test from "node:test";
import { compareCandidates, parseWatchSource, watchSources } from "../scripts/lib/incident-feeds.mjs";

const source = watchSources.find(source => source.id === "fulll")!;
const now = Date.parse("2026-11-16T19:00:00Z");
const incidentUrl = "https://status.fulll.io/en/incident/1126769";
const item = (url = incidentUrl, date = "Mon, 16 Nov 2026 13:19:35 -0000", content = "Portail went down.") =>
  `<item><title>Portail indisponible</title><link>${url}</link><pubDate>${date}</pubDate><description>${content}</description></item>`;
const feed = (items: string) => `<rss version="2.0"><channel><title>fulll</title>${items}</channel></rss>`;

test("fulll : le RSS anglais regroupe les notifications d’un avis et détecte sa reprise", () => {
  assert.ok(source, "Le RSS doit être explicitement enregistré avant sa lecture");
  const initial = parseWatchSource(source, feed(item()), now)[0];
  const resolution = item(incidentUrl, "Mon, 16 Nov 2026 14:57:41 -0000", "Portail recovered.");
  const revised = parseWatchSource(source, feed(`${resolution}${item()}`), now);
  assert.equal(revised.length, 1);
  assert.equal(revised[0].id, "fulll-1126769");
  assert.equal(revised[0].publishedAt, "2026-11-16T14:57:41.000Z");
  assert.equal(revised[0].content, "Portail recovered.");
  assert.deepEqual(parseWatchSource(source, feed(`${item()}${resolution}`), now), revised);
  assert.equal(compareCandidates({ [initial.id]: initial }, revised)[0].change, "updated");
});

test("Better Stack : le préfixe anglais conserve la restriction des liens d’incident", () => {
  assert.ok(source, "Le RSS doit être explicitement enregistré avant sa lecture");
  for (const path of ["/incident/1126769", "/fr/incident/1126769", "/en/incident/1126769"]) {
    assert.equal(parseWatchSource(source, feed(item(`https://status.fulll.io${path}`)), now)[0].id, "fulll-1126769");
  }
  for (const url of [
    "https://example.org/en/incident/1126769",
    "https://status.fulll.io.evil.example/en/incident/1126769",
    "https://status.fulll.io/de/incident/1126769",
    "https://status.fulll.io/en/incident/not-a-number",
    "https://status.fulll.io/en/incidents/1126769",
    "https://status.fulll.io/en/%69ncident/1126769",
    "https://status.fulll.io/en/incident/%31126769",
    "https://status.fulll.io/en%2Fincident%2F1126769",
    "https://status.fulll.io/en/incident/1126769?next=https://example.org/",
    "https://status.fulll.io/en/incident/1126769#update-1",
    "https://user:password@status.fulll.io/en/incident/1126769",
  ]) assert.throws(() => parseWatchSource(source, feed(item(url)), now));
});

test("fulll : dates futures, fuseaux absents et déclarations XML externes restent refusés", () => {
  assert.ok(source, "Le RSS doit être explicitement enregistré avant sa lecture");
  for (const date of ["Tue, 17 Nov 2026 13:19:35 -0000", "2026-11-16T13:19:35"]) {
    assert.throws(() => parseWatchSource(source, feed(item(incidentUrl, date)), now));
  }
  assert.throws(() => parseWatchSource(source, `<!DOCTYPE rss SYSTEM "https://example.org/external.dtd">${feed(item())}`, now));
});
