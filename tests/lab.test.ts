import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { lab, qualifiesForLabSeal } from "../src/data/lab.ts";
import { labSchema } from "../src/data/schema.ts";
import { analyzeFacturXXml } from "../src/lib/invoice-verifier.ts";

test("le contrat du Lab conserve trois cas, cinq étapes et trois plateformes", () => {
  assert.doesNotThrow(() => labSchema.parse(lab));
  assert.deepEqual(lab.cases.map(({ id }) => id), ["service-simple", "multi-tva", "avoir"]);
  assert.deepEqual(lab.protocol.map(({ id }) => id), ["import", "lecture", "integrite", "emission", "statut"]);
  assert.deepEqual(lab.platforms.map(({ slug }) => slug), ["qonto", "pennylane", "b2brouter"]);
});

test("chaque fixture publique correspond à son empreinte et à son résultat annoncé", async () => {
  for (const testCase of lab.cases) {
    const file = await readFile(new URL(`../public${testCase.fileHref}`, import.meta.url));
    assert.equal(file.byteLength, testCase.bytes);
    assert.equal(createHash("sha256").update(file).digest("hex"), testCase.sha256);
    const analysis = analyzeFacturXXml(file.toString("utf8"));
    assert.equal(analysis.status, "usable");
    assert.equal(analysis.metadata.invoiceNumber, testCase.expected.invoiceNumber);
    assert.equal(analysis.metadata.lineCount, testCase.expected.lineCount);
    assert.equal(analysis.metadata.grandTotal, testCase.expected.grandTotal);
    assert.equal(analysis.metadata.currency, testCase.expected.currency);
  }
});

test("le PDF Factur-X public contient le XML attendu et reste lisible localement", async () => {
  const testCase = lab.cases[0];
  assert.ok("facturXHref" in testCase);
  const pdf = await readFile(new URL(`../public${testCase.facturXHref}`, import.meta.url));
  assert.equal(pdf.byteLength, testCase.facturXBytes);
  assert.equal(createHash("sha256").update(pdf).digest("hex"), testCase.facturXSha256);

  const loadingTask = getDocument({
    data: new Uint8Array(pdf),
    disableFontFace: true,
    useSystemFonts: false,
    useWasm: false,
    enableXfa: false,
    stopAtErrors: true,
    verbosity: 0,
  });
  try {
    const document = await loadingTask.promise;
    const attachments = await document.getAttachments();
    assert.ok(attachments instanceof Map);
    assert.equal(attachments.get("factur-x.xml")?.filename, "factur-x.xml");
    const embedded = await document.getAttachmentContent("factur-x.xml");
    assert.ok(embedded instanceof Uint8Array);
    assert.equal(createHash("sha256").update(embedded).digest("hex"), testCase.sha256);
    const analysis = analyzeFacturXXml(new TextDecoder().decode(embedded), "pdf");
    assert.equal(analysis.status, "usable");
    assert.equal(analysis.metadata.profile, "EN 16931");
    assert.equal(analysis.metadata.invoiceNumber, testCase.expected.invoiceNumber);
    const page = await document.getPage(1);
    const visible = (await page.getTextContent()).items
      .map((item) => "str" in item ? item.str : "")
      .join(" ");
    assert.match(visible, /ATELIER TEST PA CHECK/);
    assert.match(visible, /ENTREPRISE DEMO HORIZON/);
    assert.match(visible, /LAB-FX-EN16931-001/);
    assert.match(visible, /120,00 EUR/);
  } finally {
    await loadingTask.destroy();
  }
});

test("la première campagne ne fabrique aucun résultat ni sceau", () => {
  for (const platform of lab.platforms) {
    assert.equal(platform.status, "not_tested");
    assert.equal(platform.evidenceLevel, "documentation_only");
    assert.equal(platform.testedAt, null);
    assert.equal(platform.environment, null);
    assert.equal(platform.sealAwarded, false);
    assert.equal(qualifiesForLabSeal(platform), false);
    assert.ok(platform.caseResults.every((result) => result.status === "not_tested"));
    assert.ok(platform.observations.every((observation) => observation.status === "not_tested" && observation.evidenceIds.length === 0));
  }
});

test("le sceau exige tous les cas, toutes les étapes et leurs preuves", () => {
  const complete = {
    evidenceLevel: "observed" as const,
    status: "tested" as const,
    testedAt: "2026-08-25T21:00:00Z",
    environment: "Bac à sable éditeur",
    caseResults: lab.cases.map(() => ({ status: "tested" as const })),
    observations: lab.protocol.map((step) => ({ status: "tested" as const, evidenceIds: [`trace-${step.id}`] })),
  };
  assert.equal(qualifiesForLabSeal(complete), true);
  assert.equal(qualifiesForLabSeal({ ...complete, observations: complete.observations.map((observation, index) => index === 2 ? { ...observation, evidenceIds: [] } : observation) }), false);
});
