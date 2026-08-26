import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { resolve } from "node:path";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const root = resolve(import.meta.dirname, "..");
const port = 38_000 + (process.pid % 1_000);
const endpoint = new URL(`http://127.0.0.1:${port}/api/mcp`);
const child = spawn(process.execPath, [resolve(root, "dist-mcp/server.mjs")], {
  cwd: root,
  env: {
    ...process.env,
    PA_CHECK_MCP_PORT: String(port),
    PA_CHECK_MCP_ALLOWED_HOSTS: "127.0.0.1,localhost",
    PA_CHECK_MCP_ALLOWED_ORIGINS: "127.0.0.1,localhost",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let stderr = "";
child.stderr.setEncoding("utf8");
child.stderr.on("data", (chunk) => { stderr += chunk; });

async function waitUntilReady() {
  child.stdout.setEncoding("utf8");
  let output = "";
  const deadline = Date.now() + 8_000;
  for await (const chunk of child.stdout) {
    output += chunk;
    if (output.includes("PA_CHECK_MCP_READY")) return;
    if (Date.now() > deadline) break;
  }
  throw new Error(`Le serveur MCP n'a pas démarré. ${stderr}`);
}

async function inspectClient(versionNegotiation) {
  const client = new Client({ name: "pa-check-smoke", version: "0.1.0" }, versionNegotiation ? { versionNegotiation } : undefined);
  const transport = new StreamableHTTPClientTransport(endpoint);
  await client.connect(transport);
  try {
    const tools = await client.listTools();
    assert.deepEqual(tools.tools.map((tool) => tool.name).sort(), [
      "answer_question",
      "find_platforms",
      "get_corpus_status",
      "get_platform",
      "search_official_directory",
    ]);
    assert.ok(tools.tools.every((tool) => tool.annotations?.readOnlyHint === true));

    const resources = await client.listResources();
    assert.equal(resources.resources.length, 7);
    assert.ok(resources.resources.some((resource) => resource.uri === "pacheck://corpus/official-directory"));

    const answer = await client.callTool({
      name: "answer_question",
      arguments: { question: "Je veux envoyer mon PDF Factur-X sans solution compatible", limit: 3 },
    });
    assert.equal(answer.isError, undefined);
    assert.match(answer.content[0]?.type === "text" ? answer.content[0].text : "", /B2Brouter/);

    const status = await client.callTool({ name: "get_corpus_status", arguments: {} });
    assert.equal(status.structuredContent?.counts?.enrichedPlatforms, 148);
    assert.equal(status.structuredContent?.counts?.approvedPlatforms, 148);
  } finally {
    await client.close();
  }
}

try {
  await Promise.race([
    waitUntilReady(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Délai de démarrage MCP dépassé")), 8_000)),
  ]);

  const health = await fetch(new URL("/healthz", endpoint));
  assert.equal(health.status, 200);
  assert.equal((await health.json()).counts.sources, 266);

  const missing = await fetch(new URL("/not-found", endpoint));
  assert.equal(missing.status, 404);

  const wrongOrigin = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://attacker.example" },
    body: "{}",
  });
  assert.equal(wrongOrigin.status, 403);

  const missingType = await fetch(endpoint, { method: "POST", body: "{}" });
  assert.equal(missingType.status, 415);

  const oversized = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ payload: "x".repeat(129 * 1024) }),
  });
  assert.equal(oversized.status, 413);

  await inspectClient(undefined);
  await inspectClient({ mode: { pin: "2026-07-28" } });

  process.stdout.write("MCP_SMOKE_OK legacy+2026 tools=5 resources=7 boundaries=ok\n");
} finally {
  child.kill("SIGTERM");
  await Promise.race([once(child, "exit"), new Promise((resolvePromise) => setTimeout(resolvePromise, 2_000))]);
}
