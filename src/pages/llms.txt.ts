import type { APIRoute } from "astro";
import { MCP_ENDPOINT } from "../mcp/corpus.ts";

const content = `# PA Check

> Service public français pour choisir une plateforme agréée, vérifier un outil de facturation et préparer un envoi Factur-X ou XML.

PA Check ne propose aucun classement sponsorisé. Les informations absentes restent indiquées comme telles. Le site et le serveur MCP sont publics, sans compte.

## Accès agent

- MCP Streamable HTTP : ${MCP_ENDPOINT}
- Documentation agent : https://pa.l0g.fr/agents/
- Corpus JSON complet : https://pa.l0g.fr/api/corpus.json
- Questions pratiques : https://pa.l0g.fr/api/questions.json
- Fiches enrichies : https://pa.l0g.fr/api/platforms.json
- Annuaire officiel : https://pa.l0g.fr/api/official-directory.json
- Révision déployée : https://pa.l0g.fr/DEPLOYED_SHA

## Pages principales

- Poser une question : https://pa.l0g.fr/questions/
- Vérifier son outil : https://pa.l0g.fr/verifier-mon-outil/
- Vérifier localement une facture : https://pa.l0g.fr/verifier-une-facture/
- Choisir une plateforme : https://pa.l0g.fr/diagnostic/
- Fiches plateformes : https://pa.l0g.fr/plateformes/
- Annuaire officiel : https://pa.l0g.fr/annuaire/
- Méthodologie : https://pa.l0g.fr/methodologie/
- Journal des changements : https://pa.l0g.fr/changements/

## Règles d'utilisation

- Citer les sources renvoyées avec la réponse.
- Conserver les mentions « à confirmer » lorsqu'une information publique manque.
- Ne jamais présenter le prévol d'un fichier comme une certification juridique.
- Ne pas envoyer une facture au serveur MCP. Le contrôle de fichier se fait uniquement dans le navigateur sur la page dédiée.
`;

export const GET: APIRoute = () => new Response(content, {
  headers: {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  },
});
