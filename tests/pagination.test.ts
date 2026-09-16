import test from "node:test";
import assert from "node:assert/strict";
import { paginate } from "../src/lib/pagination.ts";

test("pagination : tous les avis restent accessibles une seule fois", () => {
  const items = Array.from({length: 11}, (_, id) => id);
  assert.deepEqual([1, 2, 3].flatMap(page => paginate(items, page, 5).items), items);
  assert.deepEqual(paginate(items, 3, 5).items, [10]);
});
test("pagination : un filtre réduit le nombre de pages et une liste vide reste vide", () => {
  assert.deepEqual(paginate(["avis"], "3", 5), {page: 1, totalPages: 1, total: 1, start: 0, items: ["avis"]});
  assert.deepEqual(paginate([], "999", 5), {page: 1, totalPages: 1, total: 0, start: 0, items: []});
});
test("pagination : paramètres absents, malformés et hors limites", () => {
  const items = Array.from({length: 11}, (_, id) => id);
  for (const page of [null, "", "bogus", "<script>", "0", "-1", "1.5", "Infinity", NaN, Number.MAX_VALUE]) assert.equal(paginate(items, page, 5).page, 1);
  assert.equal(paginate(items, "999", 5).page, 3);
  for (const size of [0, -1, 1.5, Infinity]) assert.throws(() => paginate(items, 1, size), RangeError);
});
