import test from "node:test";
import assert from "node:assert/strict";
import { platforms } from "../src/data/platforms.ts";
import { findKnownTool, verifyKnownTool } from "../src/lib/tool-verifier.ts";

test("un outil direct complètement documenté peut être conservé", () => {
  const result = verifyKnownTool(platforms, "Tiime");
  assert.equal(result.verdict, "keep");
  assert.equal(result.platform?.slug, "tiime");
  assert.equal(result.lines.length, 4);
  assert.ok(result.lines.every((line) => line.state === "yes"));
});

test("un alias de produit reste rattaché à une valeur contrôlée", () => {
  assert.equal(findKnownTool("Sage 100")?.id, "sage");
  assert.equal(findKnownTool("Tiime Expert")?.id, "tiime");
  assert.equal(findKnownTool("SUPER PDP")?.id, "superpdp");
  assert.equal(findKnownTool("TeamSystem Sellsy")?.id, "sellsy");
});

test("Abby, Sellsy et SuperPDP disposent d'un noyau réglementaire documenté", () => {
  for (const tool of ["Abby", "Sellsy", "SuperPDP"]) {
    const result = verifyKnownTool(platforms, tool);
    assert.equal(result.verdict, "keep", `${tool} ne devrait pas être bloqué`);
    assert.ok(result.lines.every((line) => line.state === "yes"), `${tool} contient une preuve réglementaire insuffisante`);
  }
});

test("un raccordement EBP dépendant de l'édition demande une confirmation", () => {
  const result = verifyKnownTool(platforms, "EBP");
  assert.equal(result.verdict, "unconfirmed");
  assert.equal(result.platform?.slug, "cegid");
  assert.match(result.action, /confirmer par écrit/i);
});

test("un produit Sage ne peut pas hériter automatiquement du statut de la PA", () => {
  const result = verifyKnownTool(platforms, "Sage 50");
  assert.equal(result.verdict, "unconfirmed");
  assert.equal(result.platform?.slug, "sage");
  assert.match(result.headline, /édition et l'activation restent à confirmer/i);
});

test("une fonction réglementaire non documentée bloque le feu vert", () => {
  const result = verifyKnownTool(platforms, "MyUnisoft");
  assert.equal(result.verdict, "unconfirmed");
  assert.ok(result.lines.some((line) => line.label === "E-reporting" && line.state === "unknown"));
});

test("un outil absent n'est jamais déclaré non conforme", () => {
  const result = verifyKnownTool(platforms, "Outil inconnu");
  assert.equal(result.verdict, "unconfirmed");
  assert.equal(result.platform, null);
  assert.match(result.explanation, /ne signifie pas qu'il n'est pas conforme/i);
});

test("une valeur qui contient seulement le nom d'un outil n'est pas acceptée", () => {
  assert.equal(findKnownTool("Qonto<script>"), null);
});

test("une fonction explicitement absente produit une action nécessaire", () => {
  const qonto = platforms.find((platform) => platform.slug === "qonto");
  assert.ok(qonto);
  const alteredPlatforms = platforms.map((platform) => platform.slug === "qonto" ? {
    ...platform,
    receivesInvoices: { ...platform.receivesInvoices, value: false },
  } : platform);
  const result = verifyKnownTool(alteredPlatforms, "Qonto");
  assert.equal(result.verdict, "act");
});

test("une déclaration éditeur seule ne suffit jamais à produire du vert", () => {
  const alteredPlatforms = platforms.map((platform) => platform.slug === "qonto" ? {
    ...platform,
    eReporting: { ...platform.eReporting, value: true, status: "declared" as const },
  } : platform);
  const result = verifyKnownTool(alteredPlatforms, "Qonto");
  assert.equal(result.verdict, "unconfirmed");
  assert.ok(result.lines.some((line) => line.label === "E-reporting" && line.state === "unknown"));
});

test("une valeur positive sans source ne suffit jamais à produire du vert", () => {
  const alteredPlatforms = platforms.map((platform) => platform.slug === "qonto" ? {
    ...platform,
    sendsInvoices: { ...platform.sendsInvoices, sourceIds: [] },
  } : platform);
  const result = verifyKnownTool(alteredPlatforms, "Qonto");
  assert.equal(result.verdict, "unconfirmed");
  assert.ok(result.lines.some((line) => line.label === "Émission" && line.state === "unknown"));
});

test("un acteur sorti du corpus redevient une inconnue, jamais une non-conformité", () => {
  const result = verifyKnownTool(platforms, "Axonaut");
  assert.equal(result.verdict, "unconfirmed");
  assert.equal(result.platform, null);
  assert.equal(result.tool, null);
  assert.match(result.explanation, /ne signifie pas qu'il n'est pas conforme/i);
});
