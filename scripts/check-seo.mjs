import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

  if (!title) failures.push(`${publicPath} : title absent`);
  if (title.length > 90) failures.push(`${publicPath} : title trop long (${title.length} caractères)`);
  if (!description) failures.push(`${publicPath} : meta description absente`);
  if (!canonical.startsWith("https://pa.l0g.fr/")) failures.push(`${publicPath} : canonical invalide`);
  if (h1Count !== 1) failures.push(`${publicPath} : ${h1Count} H1`);
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
    if (targetUrl.pathname === "/api/mcp" || targetUrl.pathname === "/stats/") continue;
    try {
      await access(targetForPath(targetUrl.pathname));
    } catch {
      failures.push(`${publicPath} : cible interne absente ${targetUrl.pathname}`);
    }
  }
}

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
for (const requiredUrl of ["https://pa.l0g.fr/", "https://pa.l0g.fr/plateformes/", "https://pa.l0g.fr/questions/"]) {
  if (!sitemap.includes(`<loc>${requiredUrl}</loc>`)) failures.push(`sitemap.xml : ${requiredUrl} absent`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`SEO_OK ${htmlFiles.length} pages titres=${seenTitles.size} descriptions=${seenDescriptions.size} canonicals=${seenCanonicals.size} og=1200x630 liens=valides`);
