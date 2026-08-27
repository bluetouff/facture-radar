import type { APIRoute } from "astro";

const policy = [
  "Contact: mailto:olivier@l0g.fr",
  "Expires: 2027-08-26T23:59:00Z",
  "Preferred-Languages: fr, en",
  "Canonical: https://pa.l0g.fr/.well-known/security.txt",
  "Policy: https://pa.l0g.fr/securite/",
  "",
].join("\n");

export const GET: APIRoute = () => new Response(policy, {
  headers: {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  },
});
