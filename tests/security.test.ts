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
  assert.doesNotMatch(component, /\bfetch\s*\(/);
  assert.doesNotMatch(component, /location\.search/);
  assert.doesNotMatch(component, /localStorage/);
  assert.doesNotMatch(component, /sessionStorage/);
  assert.doesNotMatch(component, /\.innerHTML\s*=/);
});

test("le parcours ne fabrique plus de récapitulatif inutile ni d'identifiant d'entreprise", async () => {
  const component = await readFile(new URL("../src/components/ToolJourney.astro", import.meta.url), "utf8");
  assert.doesNotMatch(component, /name=["'](?:siren|siret|email|telephone|phone)["']/i);
  assert.doesNotMatch(component, /new Blob\(/);
  assert.doesNotMatch(component, /Télécharger le récapitulatif/);
  assert.doesNotMatch(component, /Garder sur cet appareil/);
});

test("le vérificateur de facture traite le fichier localement sans injection HTML", async () => {
  const component = await readFile(new URL("../src/components/InvoiceVerifier.astro", import.meta.url), "utf8");
  assert.match(component, /file\.arrayBuffer\(\)/);
  assert.match(component, /textContent =/);
  assert.match(component, /MAX_INVOICE_FILE_BYTES/);
  assert.match(component, /\.verifier-progress\[hidden\].*display: none !important/);
  assert.doesNotMatch(component, /\bfetch\s*\(/);
  assert.doesNotMatch(component, /localStorage/);
  assert.doesNotMatch(component, /sessionStorage/);
  assert.doesNotMatch(component, /\.innerHTML\s*=/);
});

test("l'extraction PDF désactive les fonctions de rendu inutiles et détruit le document après lecture", async () => {
  const module = await readFile(new URL("../src/lib/pdf-facturx.ts", import.meta.url), "utf8");
  assert.match(module, /disableFontFace: true/);
  assert.match(module, /useWasm: false/);
  assert.match(module, /enableXfa: false/);
  assert.match(module, /stopAtErrors: true/);
  assert.match(module, /document\.getAttachmentContent\(key\)/);
  assert.match(module, /loadingTask\.destroy\(\)/);
  assert.doesNotMatch(module, /\.getPage\s*\(/);
  assert.doesNotMatch(module, /\.render\s*\(/);
});
