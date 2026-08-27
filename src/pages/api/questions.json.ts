import type { APIRoute } from "astro";
import sources from "../../data/sources.json";
import { practicalQuestions, practicalQuestionSourceIds, QUESTIONS_CHECKED_AT } from "../../data/practical-questions";

const linkedSourceIds = new Set(practicalQuestionSourceIds);
const linkedSources = sources.filter((source) => linkedSourceIds.has(source.id));

export const GET: APIRoute = () => new Response(JSON.stringify({
  schemaVersion: "0.2.0",
  generatedAt: QUESTIONS_CHECKED_AT,
  methodology: "https://pa.l0g.fr/methodologie/",
  questions: practicalQuestions,
  sources: linkedSources,
}, null, 2), {
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  },
});
