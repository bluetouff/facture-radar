import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const setupScript = readFileSync(resolve(root, "deploy/setup-pa-check-mcp.sh"), "utf8");
const parserMatch = setupScript.match(/python3 - "\$\{MCP_BODY_FILE\}" <<'PY'\n([\s\S]*?)\nPY/);
if (!parserMatch?.[1]) throw new Error("Le validateur de réponse MCP doit rester testable");
const parser = parserMatch[1];

const validResponse = {
  jsonrpc: "2.0",
  id: 1,
  result: { serverInfo: { name: "io.github.bluetouff/pa-check" } },
};

function validateBody(body: string) {
  const fixtureDirectory = mkdtempSync(join(tmpdir(), "pa-check-mcp-response-"));
  const fixturePath = join(fixtureDirectory, "body");
  try {
    writeFileSync(fixturePath, body, { encoding: "utf8", mode: 0o600 });
    return spawnSync("python3", ["-c", parser, fixturePath], { encoding: "utf8" });
  } finally {
    rmSync(fixtureDirectory, { recursive: true, force: true });
  }
}

test("le smoke de déploiement accepte les réponses MCP JSON et SSE", () => {
  const jsonResult = validateBody(JSON.stringify(validResponse));
  assert.equal(jsonResult.status, 0, jsonResult.stderr);
  assert.match(jsonResult.stdout, /MCP_HTTPS_SMOKE_OK/);

  const sseResult = validateBody(`event: message\ndata: ${JSON.stringify(validResponse)}\n\n`);
  assert.equal(sseResult.status, 0, sseResult.stderr);
  assert.match(sseResult.stdout, /MCP_HTTPS_SMOKE_OK/);
});

test("le smoke de déploiement refuse une réponse vide ou étrangère", () => {
  assert.notEqual(validateBody("").status, 0);
  assert.notEqual(validateBody(JSON.stringify({ ...validResponse, id: 2 })).status, 0);
  assert.notEqual(validateBody("data: pas-du-json\n\n").status, 0);
});

test("le smoke HTTPS récupère corps et en-têtes en une seule requête", () => {
  const smokeStart = setupScript.indexOf("if ! curl --max-time 10");
  const smokeEnd = setupScript.indexOf("\ntrap - ERR INT TERM", smokeStart);
  assert.ok(smokeStart > 0 && smokeEnd > smokeStart);
  const publicSmoke = setupScript.slice(smokeStart, smokeEnd);
  assert.equal(publicSmoke.match(/\bcurl\b/g)?.length, 1);
  assert.match(publicSmoke, /--dump-header "\$\{MCP_HEADERS_FILE\}"/);
  assert.match(publicSmoke, /--output "\$\{MCP_BODY_FILE\}"/);
});
