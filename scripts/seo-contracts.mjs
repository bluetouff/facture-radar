import { SaxesParser } from "saxes";

/** Validate the generated sitemap against actual indexable HTML pages. */
export function validateSitemap(xml, indexablePages, today = new Date().toISOString().slice(0, 10)) {
  const failures = [];
  const entries = [];
  const stack = [];
  let current = null;
  const parser = new SaxesParser({ xmlns: true });
  parser.on("doctype", () => { throw new Error("DOCTYPE interdit"); });
  parser.on("opentag", (tag) => {
    const parent = stack.at(-1);
    if (tag.uri !== "http://www.sitemaps.org/schemas/sitemap/0.9"
      || !(stack.length === 0 && tag.local === "urlset"
        || parent === "urlset" && tag.local === "url"
        || parent === "url" && ["loc", "lastmod"].includes(tag.local))) {
      throw new Error("Structure XML de sitemap inattendue");
    }
    stack.push(tag.local);
    if (tag.local === "url") current = {};
    if (["loc", "lastmod"].includes(tag.local)) {
      if (Object.hasOwn(current, tag.local)) throw new Error("Champ de sitemap dupliqué");
      current[tag.local] = "";
    }
  });
  parser.on("text", (text) => {
    const field = stack.at(-1);
    if (current && ["loc", "lastmod"].includes(field)) current[field] += text;
    else if (text.trim()) throw new Error("Texte XML hors d’une entrée");
  });
  parser.on("closetag", (tag) => {
    if (tag.local === "url") { entries.push(current); current = null; }
    stack.pop();
  });
  try { parser.write(xml).close(); }
  catch (error) { return [`sitemap.xml : XML invalide (${error.message})`]; }

  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry.loc)) failures.push(`sitemap.xml : URL dupliquée ${entry.loc}`);
    seen.add(entry.loc);
    if (!indexablePages.has(entry.loc)) failures.push(`sitemap.xml : URL non canonique, absente ou non indexable ${entry.loc}`);
    if (entry.lastmod !== undefined) {
      const date = new Date(`${entry.lastmod}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.lastmod) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== entry.lastmod || entry.lastmod > today) failures.push(`sitemap.xml : date invalide ou future ${entry.lastmod}`);
    }
    const expectedDate = indexablePages.get(entry.loc)?.modifiedAt;
    if (expectedDate && entry.lastmod !== expectedDate) failures.push(`sitemap.xml : date différente de la revue publiée pour ${entry.loc}`);
  }
  for (const url of indexablePages.keys()) {
    if (!seen.has(url)) failures.push(`sitemap.xml : page indexable absente ${url}`);
  }
  return failures;
}
