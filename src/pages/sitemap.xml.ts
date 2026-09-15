import type { APIRoute } from "astro";
import { platforms } from "../data/platforms";
import { practicalQuestions } from "../data/practical-questions";
import { researchForPlatform } from "../data/platform-research";
import { publicSiteObservationForPlatform } from "../data/public-site-observations";

interface SitemapEntry { path: string; lastmod?: string }

const latestCheckedAt = (value: unknown): string => {
  if (!value || typeof value !== "object") return "";
  return Object.entries(value).reduce((latest, [key, item]) => {
    const candidate = key === "checkedAt" && typeof item === "string" ? item : latestCheckedAt(item);
    return candidate > latest ? candidate : latest;
  }, "");
};
const latestQuestionDate = latestCheckedAt(practicalQuestions);
const entries: SitemapEntry[] = [
  { path: "/", lastmod: "2026-09-15" },
  { path: "/verifier-mon-outil/" },
  { path: "/verifier-une-facture/" },
  { path: "/diagnostic/" },
  { path: "/plateformes/", lastmod: "2026-09-15" },
  { path: "/comparer/", lastmod: "2026-09-15" },
  { path: "/annuaire/", lastmod: "2026-09-15" },
  { path: "/a-propos/" },
  { path: "/contribuer/" },
  { path: "/agents/" },
  { path: "/methodologie/", lastmod: "2026-09-14" },
  { path: "/changements/", lastmod: "2026-09-15" },
  { path: "/conditions-utilisation/" },
  { path: "/confidentialite/", lastmod: "2026-09-15" },
  { path: "/securite/" },
  { path: "/plateformes/ecosio/", lastmod: "2026-09-14" },
  ...platforms.map((platform) => ({
    path: `/plateformes/${platform.slug}/`,
    // The breadcrumb now links to the complete directory. Later evidence updates
    // retain their own date instead of using the build time as a freshness signal.
    lastmod: ["2026-09-15", latestCheckedAt([platform, researchForPlatform(platform.slug), publicSiteObservationForPlatform(platform.slug)])].sort().at(-1),
  })),
  { path: "/questions/", lastmod: latestQuestionDate },
  ...practicalQuestions.map((question) => ({ path: `/questions/${question.slug}/`, lastmod: question.checkedAt })),
];
const escapeXml = (value: string): string => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL("https://pa.l0g.fr");
  const urls = entries.map(({ path, lastmod }) => `<url><loc>${escapeXml(new URL(path, base).href)}</loc>${lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ""}</url>`).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
