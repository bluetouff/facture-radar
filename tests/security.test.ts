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

test("la recherche d'accueil reste locale et construit ses résultats sans HTML injecté", async () => {
  const component = await readFile(new URL("../src/components/UseCaseNavigator.astro", import.meta.url), "utf8");
  assert.match(component, /textContent = entry\.label/);
  assert.match(component, /maxlength="120"/);
  assert.doesNotMatch(component, /<form[^>]*answer-finder/i);
  assert.doesNotMatch(component, /\bfetch\s*\(/);
  assert.doesNotMatch(component, /localStorage|sessionStorage|indexedDB/);
  assert.doesNotMatch(component, /\.innerHTML\s*=/);
  assert.doesNotMatch(component, /location\.search/);
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


test("aucune dépendance de sandbox PA n'est exposée dans le produit", async () => {
  const publicSurfaces = await Promise.all([
    "../src/pages/index.astro",
    "../src/pages/verifier-mon-outil.astro",
    "../src/components/ToolJourney.astro",
    "../src/layouts/BaseLayout.astro",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")));
  assert.doesNotMatch(publicSurfaces.join("\n"), /sandbox|B2BROUTER_SANDBOX|X-B2B-API-Key|\/lab\//i);
});
