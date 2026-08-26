import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isPublicHttpUrl, normalizePublicHttpUrl } from "../src/lib/urls.ts";
import { lab } from "../src/data/lab.ts";

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

test("le Passeport n'ajoute aucun champ libre, stockage ou appel réseau", async () => {
  const component = await readFile(new URL("../src/components/InvoicePassport.astro", import.meta.url), "utf8");
  const controller = await readFile(new URL("../src/components/InvoiceVerifier.astro", import.meta.url), "utf8");
  assert.match(controller, /passportRouteIds\.has\(routeId\)/);
  assert.match(controller, /textContent = value/);
  assert.doesNotMatch(component, /<(?:form|input|textarea|select)\b/i);
  assert.doesNotMatch(`${component}\n${controller}`, /\bfetch\s*\(/);
  assert.doesNotMatch(`${component}\n${controller}`, /localStorage|sessionStorage|indexedDB/);
  assert.doesNotMatch(`${component}\n${controller}`, /\.innerHTML\s*=/);
  assert.doesNotMatch(`${component}\n${controller}`, /location\.(?:search|hash)/);
});

test("le Passeport n'affiche que le statut technique, le conteneur et le profil", async () => {
  const component = await readFile(new URL("../src/components/InvoiceVerifier.astro", import.meta.url), "utf8");
  const update = component.match(/function updatePassport\(analysis: InvoiceAnalysis\): void \{([\s\S]*?)\n\s*\}\n\n\s*function showInput/);
  assert.ok(update);
  const updateBody = update[1];
  if (typeof updateBody !== "string") throw new Error("Contrôleur Passeport introuvable");
  assert.match(updateBody, /analysis\.status/);
  assert.match(updateBody, /analysis\.metadata\.profile/);
  assert.match(updateBody, /analysis\.metadata\.container/);
  assert.doesNotMatch(updateBody, /invoiceNumber|seller|buyer|grandTotal|currency|issueDate/);
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

test("le formulaire PA prépare un message local sans endpoint ni publication automatique", async () => {
  const page = await readFile(new URL("../src/pages/contribuer.astro", import.meta.url), "utf8");
  const script = await readFile(new URL("../public/scripts/contribution-form.js", import.meta.url), "utf8");
  assert.match(script, /const recipient = "olivier@l0g\.fr"/);
  assert.match(script, /\["http:", "https:"\]\.includes/);
  assert.match(script, /encodeURIComponent\(message\.body\)/);
  assert.match(page, /Pas de publication automatique/);
  assert.doesNotMatch(script, /\bfetch\s*\(/);
  assert.doesNotMatch(script, /localStorage|sessionStorage/);
  assert.doesNotMatch(script, /\.innerHTML\s*=/);
  assert.doesNotMatch(page, /<form[^>]+action=/);
});

test("le Lab n'ajoute aucun dépôt de fichier, champ libre ou publication automatique", async () => {
  const page = await readFile(new URL("../src/pages/lab.astro", import.meta.url), "utf8");
  const contract = await readFile(new URL("../src/data/lab.ts", import.meta.url), "utf8");
  assert.match(page, /Pas encore vérifié/);
  assert.match(page, /PA Check conduit le test et publie le résultat obtenu/);
  assert.doesNotMatch(page, /<(?:form|input|textarea|select)\b/i);
  assert.doesNotMatch(`${page}\n${contract}`, /\bfetch\s*\(/);
  assert.doesNotMatch(`${page}\n${contract}`, /localStorage|sessionStorage|indexedDB/);
  assert.doesNotMatch(`${page}\n${contract}`, /\.innerHTML\s*=/);
  assert.doesNotMatch(`${page}\n${contract}`, /location\.(?:search|hash)/);
});

test("le runner B2Brouter reste local, sans secret public ni route d’envoi", async () => {
  const runner = await readFile(new URL("../scripts/run-b2brouter-lab.ts", import.meta.url), "utf8");
  const client = await readFile(new URL("../src/lib/b2brouter-lab.ts", import.meta.url), "utf8");
  const publicPage = await readFile(new URL("../src/pages/lab.astro", import.meta.url), "utf8");
  const homePage = await readFile(new URL("../src/pages/index.astro", import.meta.url), "utf8");

  assert.match(runner, /process\.env/);
  assert.match(client, /apiKey\.startsWith\("test_"\)/);
  assert.match(client, /redirect: "error"/);
  assert.match(client, /send_after_import", "false"/);
  assert.match(runner, /new SandboxRequestBudget\(1\)/);
  assert.match(runner, /fixture\.id === "service-simple"/);
  assert.doesNotMatch(`${runner}\n${client}`, /send_invoice|send_after_import", "true"/);
  assert.doesNotMatch(`${publicPage}\n${homePage}`, /b2brouter-lab|B2BROUTER_SANDBOX_API_KEY|B2BROUTER_SANDBOX_ACCOUNT_ID|X-B2B-API-Key/);
});

test("les jeux du Lab sont locaux, synthétiques et réservés au test", async () => {
  for (const testCase of lab.cases) {
    assert.match(testCase.fileHref, /^\/lab\/fixtures\/[a-z0-9-]+\.xml$/);
    const fixture = await readFile(new URL(`../public${testCase.fileHref}`, import.meta.url), "utf8");
    assert.match(fixture, /Données entièrement fictives/);
    assert.match(fixture, /environnement de test/);
    assert.doesNotMatch(fixture, /bluetouff|l0g\.fr|olivier@/i);
  }
});
