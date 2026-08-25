import test from "node:test";
import assert from "node:assert/strict";
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
