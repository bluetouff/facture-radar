import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  answerQuestion,
  corpusManifest,
  corpusResources,
  findPlatforms,
  getPlatform,
  MCP_CORPUS_CHECKED_AT,
  MCP_SERVER_NAME,
  MCP_SERVER_TITLE,
  MCP_SERVER_VERSION,
  searchOfficialDirectory,
  searchPlatforms,
  type CorpusRevision,
} from "./corpus.ts";

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

function jsonText(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function answerText(result: ReturnType<typeof answerQuestion>): string {
  if (!result.answer) {
    return `${result.fallback?.message ?? "Réponse absente."}\n\nUtilisez une autre formulation ou consultez la liste des questions disponibles.`;
  }
  const options = result.answer.recommendations
    .map((item) => `- ${item.label} : ${item.detail}`)
    .join("\n");
  return `${result.answer.title}\n\n${result.answer.answer}\n\n${result.answer.detail}\n\nOptions à regarder :\n${options}\n\nProchaine action : ${result.answer.nextAction.label} (${result.answer.nextAction.url})`;
}

function platformText(platform: NonNullable<ReturnType<typeof getPlatform>>): string {
  const pricing = platform.pricing.value?.label ?? "Tarif public à confirmer";
  const unknowns = platform.pointsToConfirm.length > 0
    ? platform.pointsToConfirm.map((item) => `- ${item}`).join("\n")
    : "- Aucun point prioritaire signalé dans la fiche actuelle";
  return `${platform.name}\n\n${platform.summary}\n\nPrix public : ${pricing}\n\nÀ confirmer avant de choisir :\n${unknowns}\n\nFiche complète : ${platform.profileUrl}`;
}

function matchingText(result: ReturnType<typeof findPlatforms>): string {
  const heading = result.eligibleCount > 0
    ? `${result.eligibleCount} option(s) répondent aux critères documentés.`
    : "Aucune fiche ne répond à tous les critères documentés.";
  const options = result.options.map((option) => {
    const reason = option.fitsAllCriteria
      ? option.whyItMayFit.join("; ")
      : [...option.blockers, ...option.pointsToConfirm].join("; ");
    return `- ${option.name} : ${reason || "consultez la fiche"} (${option.url})`;
  }).join("\n");
  return `${heading}\n\n${options}\n\n${result.note}`;
}

export function createPaCheckMcpServer(revision: CorpusRevision): McpServer {
  const server = new McpServer({
    name: MCP_SERVER_NAME,
    title: MCP_SERVER_TITLE,
    version: MCP_SERVER_VERSION,
    description: "Réponses publiques sur les plateformes agréées et la facture électronique en France.",
  }, {
    instructions: [
      "Répondez d'abord à la question concrète de l'utilisateur.",
      "N'inventez jamais une fonction, un tarif ou une compatibilité absent du corpus.",
      "Lorsque le corpus indique qu'un point reste à confirmer, conservez cette limite.",
      "Ne demandez ni facture, ni SIREN, ni identifiant de compte. Le serveur ne traite que des informations publiques.",
      "Pour contrôler un fichier Factur-X ou XML, renvoyez l'utilisateur vers https://pa.l0g.fr/verifier-une-facture/ : le fichier y reste dans son navigateur.",
    ].join(" "),
  });

  const resources = corpusResources(revision);
  const resourceDefinitions = [
    ["manifest", "pacheck://corpus/manifest", "État et périmètre du corpus", resources.manifest],
    ["questions", "pacheck://corpus/questions", "Questions pratiques et réponses publiées", resources.questions],
    ["platforms", "pacheck://corpus/platforms", "Vingt-cinq fiches de plateformes enrichies", resources.platforms],
    ["official-directory", "pacheck://corpus/official-directory", "Annuaire officiel complet de la DGFiP", resources.officialDirectory],
    ["journeys", "pacheck://corpus/journeys", "Parcours d'activation des outils étudiés", resources.journeys],
    ["invoice-routes", "pacheck://corpus/invoice-routes", "Options publiques d'envoi d'un fichier déjà produit", resources.invoiceRoutes],
    ["sources", "pacheck://corpus/sources", "Documents publics reliés au corpus", resources.sources],
  ] as const;

  for (const [name, uri, description, value] of resourceDefinitions) {
    server.registerResource(name, uri, {
      title: description,
      description,
      mimeType: "application/json",
    }, async (requestedUri) => ({
      contents: [{
        uri: requestedUri.href,
        mimeType: "application/json",
        text: jsonText(value),
      }],
    }));
  }

  server.registerTool("answer_question", {
    title: "Répondre à une question pratique",
    description: "Cherche dans les réponses publiées de PA Check et renvoie d'abord la réponse la plus directement utilisable, ses options, les points à contrôler et les sources associées. Utilisez cet outil pour une question en langage courant.",
    inputSchema: z.object({
      question: z.string().trim().min(2).max(180).describe("Question concrète en français, sans donnée personnelle"),
      limit: z.number().int().min(1).max(5).default(3).describe("Nombre maximal de questions proches à considérer"),
    }).strict(),
    annotations: readOnlyAnnotations,
  }, async ({ question, limit }) => {
    const result = answerQuestion(question, limit);
    return {
      content: [{ type: "text", text: answerText(result) }],
      structuredContent: result,
    };
  });

  server.registerTool("get_platform", {
    title: "Lire une fiche plateforme",
    description: "Renvoie une fiche enrichie par son nom ou son identifiant : prix public, volume, fonctions, conditions, informations manquantes et documents liés. N'accepte ni URL ni récupération distante.",
    inputSchema: z.object({
      name: z.string().trim().min(2).max(80).describe("Nom ou identifiant exact de la plateforme"),
    }).strict(),
    annotations: readOnlyAnnotations,
  }, async ({ name }) => {
    const platform = getPlatform(name);
    if (!platform) {
      const suggestions = searchPlatforms(name, 5);
      const result = { found: false, query: name, suggestions };
      return {
        content: [{
          type: "text",
          text: suggestions.length > 0
            ? `Fiche exacte introuvable. Suggestions : ${suggestions.map((item) => item.name).join(", ")}.`
            : "Fiche introuvable dans les vingt-cinq plateformes enrichies. Essayez l'annuaire officiel.",
        }],
        structuredContent: result,
        isError: true,
      };
    }
    const result = { found: true, platform };
    return {
      content: [{ type: "text", text: platformText(platform) }],
      structuredContent: result,
    };
  });

  server.registerTool("find_platforms", {
    title: "Trouver des plateformes adaptées",
    description: "Applique les critères publics de PA Check à vingt-cinq fiches enrichies. Il ne s'agit pas d'un classement commercial. Si un critère obligatoire n'est pas documenté, l'outil le signale au lieu de supposer un oui.",
    inputSchema: z.object({
      size: z.enum(["micro", "tpe", "pme", "eti", "ge"]).describe("Taille de l'entreprise"),
      monthlyInvoices: z.number().int().min(0).max(100_000).default(10).describe("Total mensuel approximatif des factures d'achat et de vente"),
      freeOnly: z.boolean().default(false).describe("Exiger une offre gratuite documentée"),
      noBankAccount: z.boolean().default(false).describe("Exiger une utilisation sans compte bancaire professionnel chez la plateforme"),
      needsAccountantAccess: z.boolean().default(false).describe("Exiger un accès documenté pour le comptable"),
      needsApi: z.boolean().default(false).describe("Exiger une API publique documentée"),
      needsInternationalReporting: z.boolean().default(false).describe("Exiger l'e-reporting B2C ou international documenté"),
      priorities: z.array(z.enum(["simplicity", "ecosystem", "documentation", "reversibility"]))
        .max(2)
        .default(["simplicity"])
        .describe("Une ou deux priorités maximum"),
      limit: z.number().int().min(1).max(10).default(5),
    }).strict(),
    annotations: readOnlyAnnotations,
  }, async (input) => {
    const result = findPlatforms(input);
    return {
      content: [{ type: "text", text: matchingText(result) }],
      structuredContent: result,
    };
  });

  server.registerTool("search_official_directory", {
    title: "Chercher dans l'annuaire officiel",
    description: "Cherche un nom de plateforme dans le relevé DGFiP complet. Les résultats distinguent les plateformes approuvées de celles encore en attente dans l'instantané public.",
    inputSchema: z.object({
      query: z.string().trim().min(2).max(80).describe("Nom de plateforme ou ville"),
      status: z.enum(["approved", "pending", "all"]).default("all"),
      limit: z.number().int().min(1).max(20).default(10),
    }).strict(),
    annotations: readOnlyAnnotations,
  }, async ({ query, status, limit }) => {
    const matches = searchOfficialDirectory(query, status, limit);
    const result = {
      query,
      status,
      snapshotDate: resources.officialDirectory.snapshotDate,
      count: matches.length,
      matches,
      source: resources.officialDirectory.sourcePage,
    };
    return {
      content: [{
        type: "text",
        text: matches.length > 0
          ? matches.map((entry) => `- ${entry.name} : ${entry.status === "approved" ? "approuvée" : "en attente"}${entry.registeredAt ? ` depuis le ${entry.registeredAt}` : ""}`).join("\n")
          : `Aucun résultat dans l'instantané DGFiP du ${resources.officialDirectory.snapshotDate}.`,
      }],
      structuredContent: result,
    };
  });

  server.registerTool("get_corpus_status", {
    title: "Connaître l'état du corpus",
    description: "Renvoie la révision servie, les dates de contrôle, le nombre de questions, de fiches, de plateformes officielles et de sources. À utiliser avant une réponse sensible à la fraîcheur des informations.",
    inputSchema: z.object({}).strict(),
    annotations: readOnlyAnnotations,
  }, async () => {
    const result = corpusManifest(revision);
    return {
      content: [{
        type: "text",
        text: `Corpus PA Check vérifié au ${MCP_CORPUS_CHECKED_AT}. ${result.counts.enrichedPlatforms} fiches enrichies, ${result.counts.approvedPlatforms} plateformes approuvées dans l'annuaire et ${result.counts.sources} sources publiques. Révision ${revision.revision}.`,
      }],
      structuredContent: result,
    };
  });

  return server;
}
