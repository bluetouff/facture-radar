import test from "node:test";
import assert from "node:assert/strict";
import sources from "../src/data/sources.json" with { type: "json" };
import { collectJourneySourceIds, journeyProfiles } from "../src/data/journey-profiles.ts";
import { platforms } from "../src/data/platforms.ts";
import { buildInvoiceJourney, findJourneyProfile } from "../src/lib/journey.ts";

test("sept parcours détaillés correspondent exactement aux produits étudiés", () => {
  assert.equal(journeyProfiles.length, 7);
  assert.equal(findJourneyProfile("Tiime"), "tiime");
  assert.equal(findJourneyProfile("Sage50"), "sage-50");
  assert.equal(findJourneyProfile("Abby"), "abby");
  assert.equal(findJourneyProfile("Indy"), "indy");
  assert.equal(findJourneyProfile("Pennylane"), "pennylane");
  assert.equal(findJourneyProfile("Qonto Facturation"), "qonto");
  assert.equal(findJourneyProfile("SUPER PDP"), "superpdp");
  assert.equal(findJourneyProfile("Sage"), null);
  assert.equal(findJourneyProfile("Tiime Expert"), null);
  assert.equal(findJourneyProfile("Sage 100"), null);
});

test("Tiime actif produit un parcours exploitable sans surcoût PA", () => {
  const journey = buildInvoiceJourney(platforms, {
    tool: "Tiime",
    audience: "micro",
    activation: "yes",
  });

  assert.ok(journey);
  assert.equal(journey.status, "ready");
  assert.equal(journey.platformSlug, "tiime");
  assert.equal(journey.cost.paMonthlySurcharge, 0);
  assert.deepEqual(journey.cost.horizons.map((horizon) => horizon.minimum), [0, 0, 0]);
  assert.equal(journey.deadlines[0]?.date, "1er septembre 2026");
  assert.equal(journey.deadlines[1]?.date, "1er septembre 2027");
});

test("une activation inconnue ne produit jamais un feu vert", () => {
  for (const tool of journeyProfiles.map((profile) => profile.aliases[0]!)) {
    const journey = buildInvoiceJourney(platforms, {
      tool,
      audience: "micro",
      activation: "unknown",
    });
    assert.ok(journey);
    assert.equal(journey.status, "confirm");
    assert.ok(journey.nodes.some((node) => node.state === "confirm"));
  }
});

test("une activation absente conduit à une action concrète", () => {
  const journey = buildInvoiceJourney(platforms, {
    tool: "Sage 50",
    audience: "micro",
    activation: "no",
  });

  assert.ok(journey);
  assert.equal(journey.status, "action");
  assert.match(journey.headline, /activer|finaliser/i);
  assert.ok(journey.actions.length >= 2);
});

test("le calendrier distingue ETI-GE et micro-PME", () => {
  const small = buildInvoiceJourney(platforms, { tool: "Tiime", audience: "tpe-pme", activation: "yes" });
  const large = buildInvoiceJourney(platforms, { tool: "Tiime", audience: "eti-ge", activation: "yes" });
  assert.ok(small && large);
  assert.equal(small.deadlines[1]?.date, "1er septembre 2027");
  assert.equal(large.deadlines[1]?.date, "1er septembre 2026");
});

test("le coût Sage 50 est présenté comme un minimum, pas comme un devis", () => {
  const journey = buildInvoiceJourney(platforms, {
    tool: "Sage 50",
    audience: "micro",
    activation: "yes",
  });

  assert.ok(journey);
  assert.equal(journey.cost.baseMonthlyFrom, 18);
  assert.equal(journey.cost.paMonthlySurcharge, 0);
  assert.deepEqual(journey.cost.horizons.map((horizon) => horizon.minimum), [216, 432, 648]);
  assert.match(journey.cost.caveat, /minimum public/i);
});

test("un outil hors vertical conserve le vérificateur générique", () => {
  assert.equal(buildInvoiceJourney(platforms, {
    tool: "Sellsy",
    audience: "micro",
    activation: "unknown",
  }), null);
});

test("Pennylane distingue le plan micro du prix d'appel des autres entreprises", () => {
  const micro = buildInvoiceJourney(platforms, { tool: "Pennylane", audience: "micro", activation: "yes" });
  const pme = buildInvoiceJourney(platforms, { tool: "Pennylane", audience: "tpe-pme", activation: "yes" });
  assert.ok(micro && pme);
  assert.equal(micro.cost.baseMonthlyFrom, 0);
  assert.equal(pme.cost.baseMonthlyFrom, 7);
  assert.deepEqual(pme.cost.horizons.map((horizon) => horizon.minimum), [84, 168, 252]);
});

test("Qonto reste à confirmer tant que l'e-reporting n'est pas généralisé", () => {
  const journey = buildInvoiceJourney(platforms, { tool: "Qonto", audience: "tpe-pme", activation: "yes" });
  assert.ok(journey);
  assert.equal(journey.status, "confirm");
  assert.match(journey.headline, /e-reporting reste à confirmer/i);
  assert.ok(journey.nodes.some((node) => node.label === "Flux couverts" && node.state === "confirm"));
  assert.ok(journey.actions.some((action) => /e-reporting/i.test(action.title)));
});

test("SuperPDP expose le plafond et le coût KYC sans les masquer dans un abonnement", () => {
  const journey = buildInvoiceJourney(platforms, { tool: "SuperPDP", audience: "tpe-pme", activation: "yes" });
  assert.ok(journey);
  assert.equal(journey.cost.baseMonthlyFrom, 0);
  assert.match(journey.cost.label, /1 000 factures par mois/i);
  assert.match(journey.cost.caveat, /2 € HT/i);
});

test("chaque fait réglementaire du parcours garde une source existante", () => {
  const sourceIds = new Set(sources.map((source) => source.id));
  for (const profile of journeyProfiles) {
    const journey = buildInvoiceJourney(platforms, { tool: profile.aliases[0]!, audience: "micro", activation: "yes" });
    assert.ok(journey);
    assert.ok(journey.nodes.filter((node) => node.label !== "Rattachement" && node.label !== "Inscription").every((node) => node.sourceIds.length > 0));
    assert.ok(journey.deadlines.every((deadline) => deadline.sourceIds.length > 0));
    assert.ok(journey.cost.sourceIds.length > 0);
    assert.ok(collectJourneySourceIds(profile).every((sourceId) => sourceIds.has(sourceId)), `${profile.id} référence une source absente`);
  }
});
