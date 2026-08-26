import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { hostHeaderValidation, originValidation, toNodeHandler } from "@modelcontextprotocol/node";
import { corpusManifest, type CorpusRevision } from "./corpus.ts";
import { createPaCheckMcpServer } from "./server.ts";

declare const __PA_CHECK_BUILD_SHA__: string | undefined;
declare const __PA_CHECK_BUILD_TIME__: string | undefined;

const HOST = "127.0.0.1";
const DEFAULT_PORT = 3747;
const MAX_BODY_BYTES = 128 * 1024;
const REQUEST_TIMEOUT_MS = 15_000;
const MCP_PATH = "/api/mcp";
const HEALTH_PATH = "/healthz";

function safeBuildValue(name: "sha" | "time"): string {
  if (name === "sha") {
    const runtimeValue = process.env.PA_CHECK_REVISION;
    if (runtimeValue && /^[0-9a-f]{40}$/.test(runtimeValue)) return runtimeValue;
    if (typeof __PA_CHECK_BUILD_SHA__ === "string" && /^[0-9a-f]{40}$/.test(__PA_CHECK_BUILD_SHA__)) {
      return __PA_CHECK_BUILD_SHA__;
    }
    return "development";
  }
  if (typeof __PA_CHECK_BUILD_TIME__ === "string" && !Number.isNaN(Date.parse(__PA_CHECK_BUILD_TIME__))) {
    return __PA_CHECK_BUILD_TIME__;
  }
  return "unknown";
}

export const MCP_REVISION: CorpusRevision = {
  revision: safeBuildValue("sha"),
  builtAt: safeBuildValue("time"),
};

function parsePort(value: string | undefined): number {
  if (value === undefined) return DEFAULT_PORT;
  if (!/^\d{2,5}$/.test(value)) throw new Error("PA_CHECK_MCP_PORT invalide");
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1024 || port > 65_535) throw new Error("PA_CHECK_MCP_PORT invalide");
  return port;
}

function parseHostnames(value: string | undefined, fallback: string[]): string[] {
  const entries = value === undefined ? fallback : value.split(",").map((item) => item.trim()).filter(Boolean);
  if (entries.length === 0 || entries.length > 8) throw new Error("Liste de noms d'hôte invalide");
  for (const entry of entries) {
    if (!/^(?:localhost|127\.0\.0\.1|\[::1\]|[a-z0-9.-]+)$/i.test(entry) || entry.includes("..")) {
      throw new Error("Nom d'hôte interdit dans la configuration MCP");
    }
  }
  return [...new Set(entries.map((entry) => entry.toLocaleLowerCase("en")))];
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(payload).toString(),
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
  });
  res.end(payload);
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let received = 0;
  for await (const rawChunk of req) {
    const chunk = Buffer.isBuffer(rawChunk) ? rawChunk : Buffer.from(rawChunk);
    received += chunk.byteLength;
    if (received > MAX_BODY_BYTES) throw new RequestBoundaryError(413, "Requête trop volumineuse");
    chunks.push(chunk);
  }
  if (received === 0) throw new RequestBoundaryError(400, "Corps JSON manquant");
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RequestBoundaryError(400, "Corps JSON invalide");
  }
}

class RequestBoundaryError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function setResponseHeaders(res: ServerResponse): void {
  res.setHeader("cache-control", "no-store");
  res.setHeader("content-security-policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  res.setHeader("referrer-policy", "no-referrer");
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("x-frame-options", "DENY");
}

export function createPaCheckHttpServer() {
  const allowedHosts = parseHostnames(process.env.PA_CHECK_MCP_ALLOWED_HOSTS, ["127.0.0.1", "localhost", "pa.l0g.fr"]);
  const allowedOrigins = parseHostnames(process.env.PA_CHECK_MCP_ALLOWED_ORIGINS, ["127.0.0.1", "localhost", "pa.l0g.fr"]);
  const validateHost = hostHeaderValidation(allowedHosts);
  const validateOrigin = originValidation(allowedOrigins);
  const handler = createMcpHandler(() => createPaCheckMcpServer(MCP_REVISION), { responseMode: "json" });
  const nodeHandler = toNodeHandler(handler, {
    onerror: () => undefined,
  });

  const httpServer = createServer(async (req, res) => {
    setResponseHeaders(res);
    if (!validateHost(req, res) || !validateOrigin(req, res)) return;
    const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");

    if (requestUrl.pathname === HEALTH_PATH && req.method === "GET") {
      const manifest = corpusManifest(MCP_REVISION);
      writeJson(res, 200, {
        status: "ok",
        revision: MCP_REVISION,
        checkedAt: manifest.checkedAt,
        counts: manifest.counts,
      });
      return;
    }

    if (requestUrl.pathname !== MCP_PATH) {
      writeJson(res, 404, { error: "Not found" });
      return;
    }
    if (!req.method || !["POST", "GET", "DELETE"].includes(req.method)) {
      res.setHeader("allow", "POST, GET, DELETE");
      writeJson(res, 405, { error: "Method not allowed" });
      return;
    }
    if (req.method === "POST") {
      const contentType = req.headers["content-type"]?.split(";", 1)[0]?.trim().toLocaleLowerCase("en");
      if (contentType !== "application/json") {
        writeJson(res, 415, { error: "Content-Type application/json requis" });
        return;
      }
      const contentLength = req.headers["content-length"];
      if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_BODY_BYTES)) {
        writeJson(res, 413, { error: "Requête trop volumineuse" });
        return;
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    req.once("aborted", () => controller.abort());
    try {
      const parsedBody = req.method === "POST" ? await readJsonBody(req) : undefined;
      if (controller.signal.aborted) throw new RequestBoundaryError(408, "Délai dépassé");
      await nodeHandler(req, res, parsedBody);
    } catch (error) {
      if (res.headersSent) {
        res.end();
      } else if (error instanceof RequestBoundaryError) {
        writeJson(res, error.status, { error: error.message });
      } else {
        writeJson(res, 500, { error: "Erreur interne" });
      }
    } finally {
      clearTimeout(timeout);
    }
  });

  httpServer.requestTimeout = REQUEST_TIMEOUT_MS;
  httpServer.headersTimeout = 10_000;
  httpServer.keepAliveTimeout = 5_000;
  httpServer.maxHeadersCount = 48;
  httpServer.maxRequestsPerSocket = 100;
  httpServer.on("clientError", (_error, socket) => {
    socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
  });

  return { httpServer, handler };
}

export function startPaCheckHttpServer(): void {
  const port = parsePort(process.env.PA_CHECK_MCP_PORT);
  const { httpServer, handler } = createPaCheckHttpServer();
  httpServer.listen(port, HOST, () => {
    process.stdout.write(`PA_CHECK_MCP_READY ${HOST}:${port} ${MCP_REVISION.revision}\n`);
  });

  const shutdown = (): void => {
    httpServer.close(() => {
      void handler.close().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 5_000).unref();
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

startPaCheckHttpServer();
