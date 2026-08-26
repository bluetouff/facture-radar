import test from "node:test";
import assert from "node:assert/strict";
import sources from "../src/data/sources.json" with { type: "json" };
import { PASSPORT_CHECKED_AT, passportRoutes } from "../src/data/passport-routes.ts";

test("le Passeport couvre exactement six routes documentées", () => {
  assert.equal(passportRoutes.length, 6);
  assert.deepEqual(
    new Set(passportRoutes.map((route) => route.slug)),
    new Set(["qonto", "pennylane", "b2brouter", "superpdp", "tiime", "abby"]),
  );
});

test("chaque route compare les mêmes quatre points sans score opaque", () => {
  for (const route of passportRoutes) {
    assert.equal(route.checkedAt, PASSPORT_CHECKED_AT);
    assert.deepEqual(
      new Set(route.facts.map((fact) => fact.id)),
      new Set(["entry", "format", "transmission", "integrity"]),
    );
    assert.doesNotMatch(JSON.stringify(route), /compatibilit(?:é|e)|score|pourcentage/i);
  }
});

test("une information non publiée reste vide de citation", () => {
  for (const route of passportRoutes) {
    for (const fact of route.facts) {
      if (fact.state === "not_published") assert.deepEqual(fact.sourceIds, []);
      else assert.ok(fact.sourceIds.length > 0);
    }
  }
});

test("toutes les sources du Passeport existent, sont publiques et antérieures au contrôle", () => {
  const byId = new Map(sources.map((source) => [source.id, source]));
  for (const route of passportRoutes) {
    const sourceIds = [...route.facts.flatMap((fact) => fact.sourceIds), ...route.cost.sourceIds];
    for (const sourceId of sourceIds) {
      const source = byId.get(sourceId);
      assert.ok(source, `${route.name}: source inconnue ${sourceId}`);
      assert.match(source.url, /^https?:\/\//);
      assert.ok(source.accessedAt <= route.checkedAt);
    }
  }
});

test("les liens de fiche du Passeport ne peuvent viser qu'une route interne normalisée", () => {
  for (const route of passportRoutes) {
    if (route.profileHref !== null) assert.match(route.profileHref, /^\/plateformes\/[a-z0-9-]+\/$/);
  }
});
