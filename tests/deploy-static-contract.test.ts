import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const activationScript = readFileSync(resolve(root, "deploy/activate-pa-check-site.sh"), "utf8");
const mcpSetupScript = readFileSync(resolve(root, "deploy/setup-pa-check-mcp.sh"), "utf8");

test("le déploiement statique exige le corpus public des vingt-cinq questions", () => {
  assert.match(activationScript, /"api\/questions\.json",/);
  assert.match(activationScript, /if counts\.get\("questions"\) != 25:\n    raise SystemExit\("Nombre de questions inattendu"\)/);
});

test("le smoke live vérifie les trois dimensions stables du corpus", () => {
  const smokeStart = activationScript.indexOf('LIVE_CORPUS="$(curl');
  const smokeEnd = activationScript.indexOf("\n\ntrap - ERR INT TERM", smokeStart);
  assert.ok(smokeStart > 0 && smokeEnd > smokeStart);

  const liveSmoke = activationScript.slice(smokeStart, smokeEnd);
  assert.match(liveSmoke, /counts\.get\("enrichedPlatforms"\) != 148/);
  assert.match(liveSmoke, /counts\.get\("questions"\) != 25/);
  assert.match(liveSmoke, /counts\.get\("sources"\) != 273/);
});

test("Apache sert la page PA Check avec un véritable statut 404", () => {
  assert.match(mcpSetupScript, /ErrorDocument 404 \/404\.html/);
  assert.match(mcpSetupScript, /if \[\[ "\$\{NOT_FOUND_STATUS\}" != "404" \]\]/);
  assert.match(mcpSetupScript, /Cette page a changé d'adresse\./);
  assert.match(activationScript, /"404\.html",/);
});

test("la release statique contient les images sociales attendues", () => {
  assert.match(activationScript, /"apple-touch-icon\.png",/);
  assert.match(activationScript, /"og\/pa-check-facturation-electronique\.png",/);
  assert.match(activationScript, /allowed_suffixes = \{[^\n]*"\.png"/);
});
