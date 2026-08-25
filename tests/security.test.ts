import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isPublicHttpUrl, normalizePublicHttpUrl } from "../src/lib/urls.ts";

test("les liens publics acceptent uniquement HTTP et HTTPS", () => {
  assert.equal(isPublicHttpUrl("https://www.impots.gouv.fr/"), true);
  assert.equal(isPublicHttpUrl("http://example.org/"), true);
  assert.equal(isPublicHttpUrl("javascript:alert(1)"), false);
  assert.equal(isPublicHttpUrl("data:text/html,attaque"), false);
  assert.equal(isPublicHttpUrl("pas une URL"), false);
});

test("une URL publique valide est normalisée", () => {
  assert.equal(normalizePublicHttpUrl("https://example.org"), "https://example.org/");
});

test("le diagnostic partage ses critères dans le fragment, jamais dans la query", async () => {
  const component = await readFile(new URL("../src/components/DiagnosticEngine.astro", import.meta.url), "utf8");
  assert.match(component, /location\.hash\.slice\(1\)/);
  assert.match(component, /`\$\{location\.pathname\}#\$\{params\.toString\(\)\}`/);
  assert.doesNotMatch(component, /location\.search/);
});

test("le parcours facture reste local et n'interprète jamais le contenu saisi", async () => {
  const component = await readFile(new URL("../src/components/ToolJourney.astro", import.meta.url), "utf8");
  assert.match(component, /localStorage\.setItem\(STORAGE_KEY/);
  assert.match(component, /saved\?\.version === 2/);
  assert.doesNotMatch(component, /\bfetch\s*\(/);
  assert.doesNotMatch(component, /location\.search/);
  assert.doesNotMatch(component, /\.innerHTML\s*=/);
});

test("le récapitulatif local ne demande aucun identifiant d'entreprise", async () => {
  const component = await readFile(new URL("../src/components/ToolJourney.astro", import.meta.url), "utf8");
  assert.doesNotMatch(component, /name=["'](?:siren|siret|email|telephone|phone)["']/i);
  assert.match(component, /new Blob\(\[copyText\]/);
});
