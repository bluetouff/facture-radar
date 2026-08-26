import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const activationScript = readFileSync(resolve(root, "deploy/activate-pa-check-site.sh"), "utf8");

test("le déploiement statique exige le corpus public des quinze questions", () => {
  assert.match(activationScript, /"api\/questions\.json",/);
  assert.match(activationScript, /if counts\.get\("questions"\) != 15:\n    raise SystemExit\("Nombre de questions inattendu"\)/);
});

test("le smoke live vérifie les trois dimensions stables du corpus", () => {
  const smokeStart = activationScript.indexOf('LIVE_CORPUS="$(curl');
  const smokeEnd = activationScript.indexOf("\n\ntrap - ERR INT TERM", smokeStart);
  assert.ok(smokeStart > 0 && smokeEnd > smokeStart);

  const liveSmoke = activationScript.slice(smokeStart, smokeEnd);
  assert.match(liveSmoke, /counts\.get\("enrichedPlatforms"\) != 50/);
  assert.match(liveSmoke, /counts\.get\("questions"\) != 15/);
  assert.match(liveSmoke, /counts\.get\("sources"\) != 142/);
});
