import assert from "node:assert/strict";
import test from "node:test";
import { validateSitemap } from "../scripts/seo-contracts.mjs";

const url = "https://pa.l0g.fr/annuaire/";
const pages = new Map([[url, { modifiedAt: "2026-09-15" }]]);
const sitemap = (entries: string) => `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`;
const entry = (loc = url, lastmod = "2026-09-15") => `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`;

test("le sitemap couvre exactement les pages indexables et leurs dates publiées", () => {
  assert.deepEqual(validateSitemap(sitemap(entry()), pages, "2026-09-15"), []);
  assert.deepEqual(validateSitemap(sitemap(`<url><loc>${url}</loc></url>`), new Map([[url, {}]])), []);
  assert.ok(validateSitemap(sitemap(""), pages).some((failure) => failure.includes("absente")));
  assert.ok(validateSitemap(sitemap(entry() + entry()), pages).some((failure) => failure.includes("dupliquée")));
  for (const invalid of ["https://pa.l0g.fr/404.html", "https://pa.l0g.fr.evil.example/annuaire/", `${url}?copie=1`]) {
    assert.ok(validateSitemap(sitemap(entry(invalid)), pages).some((failure) => failure.includes("non canonique")));
  }
});

test("le sitemap refuse les dates futures, impossibles et antérieures à la revue", () => {
  for (const invalid of ["2026-09-16", "2026-02-30", "15/09/2026"]) {
    assert.ok(validateSitemap(sitemap(entry(url, invalid)), pages, "2026-09-15").some((failure) => failure.includes("date invalide")));
  }
  assert.ok(validateSitemap(sitemap(entry(url, "2026-08-27")), pages).some((failure) => failure.includes("date différente")));
});

test("le sitemap refuse les XML mal formés, les champs doubles et les DTD", () => {
  for (const invalid of ["<urlset>", sitemap(`<url><loc>${url}</loc><loc>${url}</loc></url>`), `<!DOCTYPE urlset SYSTEM "https://example.invalid/dtd">${sitemap(entry())}`]) {
    assert.ok(validateSitemap(invalid, pages).some((failure) => failure.includes("XML invalide")));
  }
});
