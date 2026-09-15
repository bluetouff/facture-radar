import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateSitemap } from "./seo-contracts.mjs";

const distUrl = new URL("../dist/", import.meta.url);
const distDir = fileURLToPath(distUrl);
const failures = [];

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else files.push(fullPath);
  }
  return files;
};

const files = await walk(distDir);
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const seenTitles = new Map();
const seenCanonicals = new Map();
const seenDescriptions = new Map();
const pageLinks = new Map();
const indexablePages = new Map();

// Validate built assets: the development server does not inline these fonts.
for (const file of files.filter((file) => file.endsWith(".css"))) {
  const css = await readFile(file, "utf8");
  for (const fontFace of css.matchAll(/@font-face\s*\{[^}]+\}/gi)) {
    if (/url\(\s*["']?\s*data:/i.test(fontFace[0])) {
      failures.push(`${path.relative(distDir, file)} : police inline incompatible avec font-src 'self'`);
    }
  }
}

const capture = (html, expression) => html.match(expression)?.[1]?.trim() ?? "";
const textOnly = (value) => value.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ").trim();
const publicPathForFile = (file) => {
  const relative = path.relative(distDir, file).split(path.sep).join("/");
  if (relative === "index.html") return "/";
  if (relative.endsWith("/index.html")) return `/${relative.slice(0, -"index.html".length)}`;
  return `/${relative}`;
};
const targetForPath = (pathname) => {
  const clean = decodeURIComponent(pathname);
  if (clean.endsWith("/")) return path.join(distDir, clean, "index.html");
  if (path.extname(clean)) return path.join(distDir, clean);
  return path.join(distDir, clean, "index.html");
};

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const publicPath = publicPathForFile(file);
  const title = textOnly(capture(html, /<title>([\s\S]*?)<\/title>/i));
  const description = capture(html, /<meta\s+name="description"\s+content="([^"]*)"/i);
  const canonical = capture(html, /<link\s+rel="canonical"\s+href="([^"]*)"/i);
  const h1Count = (html.match(/<h1(?:\s[^>]*)?>/gi) ?? []).length;
  const robotsContent = capture(html, /<meta\s+name="robots"\s+content="([^"]*)"/i);
  const indexable = !robotsContent.split(/[\s,]+/).includes("noindex");
  const links = new Set();
  pageLinks.set(publicPath, links);
  if (indexable) indexablePages.set(`https://pa.l0g.fr${publicPath}`, {});

  if (!title) failures.push(`${publicPath} : title absent`);
  if (title.length > 90) failures.push(`${publicPath} : title trop long (${title.length} caractères)`);
  if (!description) failures.push(`${publicPath} : meta description absente`);
  if (canonical !== `https://pa.l0g.fr${publicPath}`) failures.push(`${publicPath} : canonical différente de l’URL publique`);
  if (h1Count !== 1) failures.push(`${publicPath} : ${h1Count} H1`);
  for (const label of ["Actions principales", "Menu principal mobile"]) {
    const navigation = capture(html, new RegExp(`<nav\\b[^>]*aria-label="${label}"[^>]*>([\\s\\S]*?)<\\/nav>`));
    if (!navigation.includes('href="/annuaire/"')) failures.push(`${publicPath} : annuaire absent du menu ${label}`);
  }
  if ((publicPath.startsWith("/plateformes/") && publicPath !== "/plateformes/") || (publicPath.startsWith("/questions/") && publicPath !== "/questions/")) {
    if (!/itemtype="https:\/\/schema\.org\/BreadcrumbList"/.test(html)) failures.push(`${publicPath} : fil d’Ariane structuré absent`);
  }
  for (const required of ["og:site_name", "og:title", "og:description", "og:url", "og:image", "og:image:type", "twitter:card", "twitter:title", "twitter:description", "twitter:image"]) {
    const attribute = required.startsWith("og:") ? "property" : "name";
    if (!new RegExp(`<meta\\s+${attribute}="${required.replace(":", "\\:")}"\\s+content="[^"]+"`, "i").test(html)) {
      failures.push(`${publicPath} : ${required} absent`);
    }
  }
  const expectedSocialImage = "https://pa.l0g.fr/og/pa-check-facturation-electronique-v2.png";
  if (!html.includes(`property="og:image" content="${expectedSocialImage}"`)
    || !html.includes(`name="twitter:image" content="${expectedSocialImage}"`)) {
    failures.push(`${publicPath} : image sociale dédiée absente`);
  }
  for (const shareTarget of ["https://x.com/intent/post?", "https://www.linkedin.com/sharing/share-offsite/?", "https://www.facebook.com/sharer/sharer.php?", "mailto:?subject="]) {
    if (!html.includes(`href="${shareTarget}`)) failures.push(`${publicPath} : partage absent ${shareTarget}`);
  }

  if (title) {
    const previous = seenTitles.get(title);
    if (previous) failures.push(`${publicPath} : title dupliqué avec ${previous}`);
    else seenTitles.set(title, publicPath);
  }
  if (canonical) {
    const previous = seenCanonicals.get(canonical);
    if (previous) failures.push(`${publicPath} : canonical dupliquée avec ${previous}`);
    else seenCanonicals.set(canonical, publicPath);
  }
  if (description) {
    const previous = seenDescriptions.get(description);
    if (previous) failures.push(`${publicPath} : description dupliquée avec ${previous}`);
    else seenDescriptions.set(description, publicPath);
  }

  for (const match of html.matchAll(/<a\b[^>]*\shref="([^"]*)"/gi)) {
    const href = match[1];
    if (!href || href === "#") {
      failures.push(`${publicPath} : lien vide`);
      continue;
    }
    if (!href.startsWith("/")) continue;
    const targetUrl = new URL(href, "https://pa.l0g.fr");
    if (targetUrl.origin !== "https://pa.l0g.fr") continue;
    links.add(targetUrl.pathname);
    if (targetUrl.pathname === "/api/mcp" || targetUrl.pathname === "/stats/") continue;
    try {
      await access(targetForPath(targetUrl.pathname));
    } catch {
      failures.push(`${publicPath} : cible interne absente ${targetUrl.pathname}`);
    }
  }
}

const reachable = new Set(["/"]);
const queue = ["/"];
for (const page of queue) {
  for (const linkedPage of pageLinks.get(page) ?? []) {
    if (!reachable.has(linkedPage) && pageLinks.has(linkedPage)) {
      reachable.add(linkedPage);
      queue.push(linkedPage);
    }
  }
}
for (const url of indexablePages.keys()) {
  if (!reachable.has(new URL(url).pathname)) failures.push(`${url} : page indexable inaccessible par les liens HTML depuis l’accueil`);
}

const directory = await readFile(new URL("annuaire/index.html", distUrl), "utf8");
const corpus = JSON.parse(await readFile(new URL("api/corpus.json", distUrl), "utf8"));
const directoryRows = [...directory.matchAll(/<article\b[^>]*class="[^"]*\bdirectory-row\b[^"]*"[^>]*>[\s\S]*?<\/article>/gi)].map((match) => match[0]);
const approvedRows = directoryRows.filter((row) => row.includes('data-status="approved"'));
const pendingRows = directoryRows.filter((row) => row.includes('data-status="pending"'));
if (approvedRows.length !== corpus.manifest.counts.approvedPlatforms || pendingRows.length !== corpus.manifest.counts.pendingPlatforms) failures.push("Annuaire : nombre d’entrées affichées incohérent avec le corpus");
const linkedProfiles = new Set(approvedRows.flatMap((row) => [...row.matchAll(/href="(\/plateformes\/[a-z0-9-]+\/)"/g)].map((match) => match[1])));
for (const platform of corpus.platforms.platforms) {
  if (!linkedProfiles.has(`/plateformes/${platform.slug}/`)) failures.push(`Annuaire : fiche ${platform.slug} non reliée par un lien HTML`);
}
if (pendingRows.some((row) => /href="\/plateformes\//.test(row))) failures.push("Annuaire : un opérateur en attente reçoit une fiche de plateforme approuvée");
for (const type of ["CollectionPage", "ItemList", "BreadcrumbList"]) {
  if (!directory.includes(`itemtype="https://schema.org/${type}"`)) failures.push(`Annuaire : balisage ${type} absent`);
}
if (!directory.includes(`itemprop="numberOfItems" content="${directoryRows.length}"`)) failures.push("Annuaire : nombre d’éléments structurés incohérent");

const home = await readFile(new URL("index.html", distUrl), "utf8");
const homeH1 = textOnly(capture(home, /<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/i)).toLocaleLowerCase("fr");
for (const phrase of ["facturation électronique", "plateforme agréée"]) {
  if (!homeH1.includes(phrase)) failures.push(`Accueil : le H1 ne contient pas « ${phrase} »`);
}
if (!/itemtype="https:\/\/schema\.org\/WebSite"/.test(home) || !/itemprop="name"\s+content="PA Check"/.test(home)) {
  failures.push("Accueil : balisage WebSite absent");
}
if (!/<meta\s+name="robots"\s+content="[^"]*max-image-preview:large/.test(home)) {
  failures.push("Accueil : aperçu d’image large non autorisé");
}

const image = await readFile(new URL("og/pa-check-facturation-electronique-v2.png", distUrl));
const pngSignature = "89504e470d0a1a0a";
if (image.subarray(0, 8).toString("hex") !== pngSignature || image.readUInt32BE(16) !== 1200 || image.readUInt32BE(20) !== 630) {
  failures.push("Image sociale : PNG 1200 × 630 attendu");
}

const robots = await readFile(new URL("robots.txt", distUrl), "utf8");
if (!robots.includes("Sitemap: https://pa.l0g.fr/sitemap.xml")) failures.push("robots.txt : sitemap absent");
const sitemap = await readFile(new URL("sitemap.xml", distUrl), "utf8");
for (const question of corpus.questions.questions) {
  indexablePages.set(`https://pa.l0g.fr/questions/${question.slug}/`, { modifiedAt: question.checkedAt });
}
failures.push(...validateSitemap(sitemap, indexablePages));

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`SEO_OK ${htmlFiles.length} pages titres=${seenTitles.size} descriptions=${seenDescriptions.size} canonicals=${seenCanonicals.size} sitemap=${indexablePages.size} fiches_reliees=${linkedProfiles.size} pages_orphelines=0 og=1200x630 liens=valides`);
