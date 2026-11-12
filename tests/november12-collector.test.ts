import assert from "node:assert/strict";
import test from "node:test";
import { compareCandidates, parseWatchSource, watchSources } from "../scripts/lib/incident-feeds.mjs";

const source = watchSources.find(source => source.id === "veryswing")!;
const now = Date.parse("2026-11-12T09:00:00Z");
const prefix = '<div class="section-timeline"><div class="panel panel-message incident"><strong>Réplication perturbée</strong><a href="https://status.veryswing.com/incidents/201" class="links"><abbr data-timeago="2026-10-29T11:09:28+01:00"></abbr></a><div class="panel-body markdown-body"><p>Investigation en cours.</p></div>';
const update = '<li class="list-group-item incident-update-item"><p>Incident réseau résolu.</p><small><abbr data-timeago="2026-11-05T11:30:09+01:00"></abbr></small><a href="https://status.veryswing.com/incidents/201#update-2" class="pull-right">Lien</a></li>';

test("Cachet : une reprise ajoutée en commentaire rejoint la file sans créer un second incident", () => {
  const initial = parseWatchSource(source, `${prefix}</div></div>`, now)[0];
  const revised = parseWatchSource(source, `${prefix}${update}</div></div>`, now)[0];
  assert.equal(revised.id, initial.id);
  assert.equal(revised.publishedAt, initial.publishedAt);
  assert.match(revised.content, /2026-11-05T10:30:09\.000Z/);
  assert.match(revised.content, /réseau résolu/);
  const changes = compareCandidates({ [initial.id]: initial }, [revised]);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].id, initial.id);
  assert.notEqual(revised.fingerprint, initial.fingerprint);
});

test("Cachet : les commentaires conservent les contrôles d’origine, d’avis, de date et de structure", () => {
  for (const invalid of [
    update.replace("/201#", "/202#"),
    update.replace("status.veryswing.com", "example.org"),
    update.replace("#update-2", "#arbitrary"),
    update.replace("11:30:09+01:00", "11:30:09"),
    update.replace("2026-11-05", "2026-11-15"),
    update.replace("</li>", ""),
  ]) assert.throws(() => parseWatchSource(source, `${prefix}${invalid}</div></div>`, now));
});
