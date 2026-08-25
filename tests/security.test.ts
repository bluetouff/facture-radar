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
