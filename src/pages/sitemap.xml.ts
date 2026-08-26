import type { APIRoute } from "astro";
import { platforms } from "../data/platforms";
import { practicalQuestions } from "../data/practical-questions";

const establishedPaths = ["/", "/verifier-mon-outil/", "/verifier-une-facture/", "/diagnostic/", "/plateformes/", "/comparer/", "/annuaire/", "/a-propos/", "/contribuer/", "/agents/", "/methodologie/", "/changements/", ...platforms.map((platform) => `/plateformes/${platform.slug}/`)];
const questionPaths = ["/questions/", ...practicalQuestions.map((question) => `/questions/${question.slug}/`)];

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL("https://pa.l0g.fr");
  const urls = [
    ...establishedPaths.map((path) => `<url><loc>${new URL(path, base).href}</loc><lastmod>2026-08-25</lastmod></url>`),
    ...questionPaths.map((path) => `<url><loc>${new URL(path, base).href}</loc><lastmod>2026-08-26</lastmod></url>`),
  ].join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
