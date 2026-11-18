import assert from "node:assert/strict";
import test from "node:test";
import { assessAudit, readGitHubAdvisory } from "../scripts/audit-dependencies.mjs";

const id = "GHSA-fc5q-39xc-vjpf";
const now = Date.parse("2026-11-18T18:00:00Z");
const withdrawn = () => ({ ghsa_id: id, withdrawn_at: "2026-11-18T15:38:56Z", updated_at: "2026-11-18T15:38:58Z", vulnerabilities: [{ package: { ecosystem: "npm", name: "picomatch" } }] });
const report = () => ({
  auditReportVersion: 2,
  vulnerabilities: {
    astro: { name: "astro", severity: "high", via: ["picomatch"] },
    picomatch: { name: "picomatch", severity: "high", via: [{ name: "picomatch", severity: "high", url: `https://github.com/advisories/${id}` }] },
  },
  metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 2, critical: 0, total: 2 } },
});

test("un audit vierge passe sans requête complémentaire", async () => {
  const clean = { auditReportVersion: 2, vulnerabilities: {}, metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 } } };
  assert.deepEqual(await assessAudit(clean, () => assert.fail("aucun appel attendu"), { exitCode: 0, now }), { blockingPackages: 0, withdrawnIds: [] });
});

test("un retrait officiel partagé par plusieurs dépendances est vérifié une seule fois", async () => {
  let calls = 0;
  const result = await assessAudit(report(), async (value: string) => { calls++; assert.equal(value, id); return withdrawn(); }, { exitCode: 1, now });
  assert.equal(calls, 1);
  assert.deepEqual(result, { blockingPackages: 2, withdrawnIds: [id] });
});

test("un avis actif ou une API indisponible bloque la livraison", async () => {
  await assert.rejects(assessAudit(report(), async () => ({ ...withdrawn(), withdrawn_at: null }), { exitCode: 1, now }));
  await assert.rejects(assessAudit(report(), async () => { throw new Error("HTTP 503"); }, { exitCode: 1, now }));
});

test("un second avis actif reste bloquant malgré le premier retrait", async () => {
  const mixed = report();
  mixed.vulnerabilities.picomatch.via.push({ name: "picomatch", severity: "high", url: "https://github.com/advisories/GHSA-2345-6789-cfgh" });
  await assert.rejects(assessAudit(mixed, async (value: string) => ({ ...withdrawn(), ghsa_id: value, withdrawn_at: value === id ? withdrawn().withdrawn_at : null }), { exitCode: 1, now }));
});

test("une entrée low contenant un avis high échoue avant le retour sans alerte", async () => {
  const inconsistent = report();
  inconsistent.vulnerabilities.astro.severity = "low";
  inconsistent.vulnerabilities.picomatch.severity = "low";
  inconsistent.metadata.vulnerabilities.high = 0;
  inconsistent.metadata.vulnerabilities.low = 2;
  await assert.rejects(assessAudit(inconsistent, () => assert.fail("aucun appel attendu"), { exitCode: 0, now }));
});

test("les codes de sortie, totaux et graphes incomplets ou cycliques échouent", async () => {
  const mutations: ((value: ReturnType<typeof report>) => void)[] = [
    value => { value.auditReportVersion = 1; },
    value => { value.metadata.vulnerabilities.high = 0; },
    value => { value.vulnerabilities.astro.via = []; },
    value => { value.vulnerabilities.astro.via = ["missing"]; },
    value => { value.vulnerabilities.astro.via = ["astro"]; },
  ];
  for (const mutate of mutations) {
    const value = report(); mutate(value);
    await assert.rejects(assessAudit(value, async () => withdrawn(), { exitCode: 1, now }));
  }
  for (const exitCode of [0, 2, null]) await assert.rejects(assessAudit(report(), async () => withdrawn(), { exitCode, now }));
});

test("un retrait doit correspondre au paquet, à l’identifiant et à une date passée", async () => {
  for (const invalid of [
    { ...withdrawn(), ghsa_id: "GHSA-2345-6789-cfgh" },
    { ...withdrawn(), withdrawn_at: "inconnue" },
    { ...withdrawn(), withdrawn_at: "2026-02-30T00:00:00Z" },
    { ...withdrawn(), withdrawn_at: "2026-11-19T00:00:00Z" },
    { ...withdrawn(), updated_at: "2026-11-17T00:00:00Z" },
    { ...withdrawn(), vulnerabilities: [{ package: { ecosystem: "npm", name: "other" } }] },
  ]) await assert.rejects(assessAudit(report(), async () => invalid, { exitCode: 1, now }));
});

test("une URL d’avis externe, redirigée ou augmentée de paramètres ne déclenche aucun accès", async () => {
  for (const url of ["https://example.com/advisories/" + id, `https://github.com/advisories/${id}?x=1`, `https://github.com/advisories/${id}#fragment`, `https://user@github.com/advisories/${id}`]) {
    const value = report(); value.vulnerabilities.picomatch.via[0]!.url = url;
    await assert.rejects(assessAudit(value, () => assert.fail("aucun accès attendu"), { exitCode: 1, now }));
  }
  await assert.rejects(readGitHubAdvisory("../../other"));
});
