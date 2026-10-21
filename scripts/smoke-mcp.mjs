import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const root = resolve(import.meta.dirname, "..");
const port = 38_000 + (process.pid % 1_000);
const endpoint = new URL(`http://127.0.0.1:${port}/api/mcp`);
const usageDirectory = await mkdtemp(join(tmpdir(), "pa-check-mcp-smoke-"));
const usagePath = join(usageDirectory, "usage.json");
const child = spawn(process.execPath, [resolve(root, "dist-mcp/server.mjs")], {
  cwd: root,
  env: {
    ...process.env,
    PA_CHECK_MCP_PORT: String(port),
    PA_CHECK_MCP_ALLOWED_HOSTS: "127.0.0.1,localhost",
    PA_CHECK_MCP_ALLOWED_ORIGINS: "127.0.0.1,localhost",
    PA_CHECK_MCP_USAGE_FILE: usagePath,
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
  const transport = new StreamableHTTPClientTransport(endpoint, {
    requestInit: { headers: { "user-agent": "pa-check-smoke/0.1.0" } },
  });
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
    assert.equal(resources.resources.length, 8);
    const incidentsResource = await client.readResource({ uri: "pacheck://corpus/incidents" });
    const incidentData = JSON.parse(incidentsResource.contents[0].text);
    assert.equal(incidentData.coverage.length, 155);
    assert.equal(incidentData.incidents.length, 83);
    assert.equal(incidentData.schemaVersion, "2.2");
    const zenfirst = incidentData.incidents.find(incident => incident.id === "zenfirst-claim-20260917");
    assert.equal(zenfirst.verification, "reported_claim");
    assert.equal(zenfirst.scope, "ecosystem_service");
    assert.deepEqual(zenfirst.platformSlugs, []);
    const altagem = incidentData.incidents.find(incident => incident.id === "altagem-claim-20260921");
    assert.equal(altagem.verification, "reported_claim");
    assert.equal(altagem.affectedService, "Altagem");
    assert.equal(altagem.scope, "connected_service");
    assert.deepEqual(altagem.platformSlugs, ["iopole"]);
    assert.equal(incidentData.research.length, 155);
    assert.equal(incidentData.collection.feeds.length, 27);
    assert.ok(resources.resources.some((resource) => resource.uri === "pacheck://corpus/official-directory"));

    const answer = await client.callTool({
      name: "answer_question",
      arguments: { question: "Je veux envoyer mon PDF Factur-X sans solution compatible", limit: 3 },
    });
    assert.equal(answer.isError, undefined);
    assert.match(answer.content[0]?.type === "text" ? answer.content[0].text : "", /B2Brouter/);

    const status = await client.callTool({ name: "get_corpus_status", arguments: {} });
    assert.equal(status.structuredContent?.counts?.enrichedPlatforms, 155);
    assert.equal(status.structuredContent?.counts?.approvedPlatforms, 155);
    const newcomer = await client.callTool({ name: "search_official_directory", arguments: { query: "KALANDA", status: "approved" } });
    assert.equal(newcomer.structuredContent?.matches?.[0]?.registeredAt, "En attente");
    const newcomerText = newcomer.content.find(item => item.type === "text")?.text ?? "";
    assert.match(newcomerText, /date d’immatriculation en attente selon la DGFiP/);
    assert.ok(!newcomerText.includes("depuis le En attente"));
  } finally {
    await client.close();
  }
}

async function inspectIsolationAndInputBudget(protocolVersion) {
  const names = ["Indy", "Dext", "Gestav", "Facnote"];
  const requestIds = [];
  const clients = names.map(() => {
    const client = new Client({ name: "pa-check-smoke", version: "0.1.0" }, {
      versionNegotiation: { mode: protocolVersion === "legacy" ? "legacy" : { pin: protocolVersion } },
    });
    const transport = new StreamableHTTPClientTransport(endpoint, {
      requestInit: { headers: { "user-agent": "pa-check-smoke/0.1.0" } },
      fetch: async (input, init) => {
        const request = new Request(input, init);
        if (request.method === "POST") {
          const message = await request.clone().json();
          if (message.method === "tools/call" && message.params?.name === "get_platform") requestIds.push(message.id);
        }
        return fetch(request);
      },
    });
    return { client, transport };
  });
  try {
    await Promise.all(clients.map(({ client, transport }) => client.connect(transport)));
    // Verify actual colliding ids and distinct results on concurrent HTTP clients.
    const results = await Promise.all(clients.map(({ client }, index) => client.callTool({
      name: "get_platform", arguments: { name: names[index] },
    })));
    assert.equal(requestIds.length, names.length);
    assert.equal(new Set(requestIds).size, 1);
    results.forEach((result, index) => {
      assert.equal(result.structuredContent.platform.slug, names[index].toLowerCase());
    });

    // Bounded substitutes for the validation-complexity advisory, below 128 KiB.
    for (const args of [
      { size: "micro", priorities: Array(33).fill("simplicity") },
      { size: "micro", extra: Object.fromEntries(Array.from({ length: 33 }, (_, index) => [`key${index}`, true])) },
    ]) {
      const rejected = await clients[0].client.callTool({ name: "find_platforms", arguments: args });
      assert.equal(rejected.isError, true);
      assert.match(rejected.content.find(item => item.type === "text")?.text ?? "", /maximum of 32 elements/);
    }

    // All documented fields, maximum volumes and both priorities remain accepted.
    const accepted = await clients[0].client.callTool({
      name: "find_platforms",
      arguments: {
        size: "ge", monthlyInvoices: 100_000, freeOnly: false, noBankAccount: false,
        needsAccountantAccess: false, needsApi: false, needsInternationalReporting: false,
        priorities: ["simplicity", "reversibility"], limit: 50,
      },
    });
    assert.equal(accepted.isError, undefined);
    assert.ok(Array.isArray(accepted.structuredContent.options));
  } finally {
    await Promise.all(clients.map(({ client }) => client.close()));
  }
}

try {
  await Promise.race([
    waitUntilReady(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Délai de démarrage MCP dépassé")), 8_000)),
  ]);

  const health = await fetch(new URL("/healthz", endpoint));
  assert.equal(health.status, 200);
  assert.equal((await health.json()).counts.sources, 495);

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
  await inspectIsolationAndInputBudget("legacy");
  await inspectIsolationAndInputBudget("2026-07-28");

  const emptyUsage = await (await fetch(new URL("/api/mcp/usage", endpoint))).json();
  assert.equal(emptyUsage.enabled, true);
  assert.equal(emptyUsage.storage_healthy, true);
  assert.equal(emptyUsage.schema_version, "1.0.0");
  assert.equal(emptyUsage.minimum_public_cohort, 5);
  assert.equal(emptyUsage.totals.requests, 0);

  const externalInitialize = await fetch(endpoint, {
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      "user-agent": "Claude Desktop",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 81,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "Claude Desktop", version: "1.0.0" },
      },
    }),
  });
  assert.equal(externalInitialize.status, 200);
  const measuredUsage = await (await fetch(new URL("/api/mcp/usage", endpoint))).json();
  assert.equal(measuredUsage.totals.requests, 1);
  assert.equal(measuredUsage.totals.initializations, 1);
  assert.deepEqual(measuredUsage.clients, []);

  process.stdout.write("MCP_SMOKE_OK legacy+2026 tools=5 resources=8 boundaries=ok isolation=ok input_budget=32 usage=private\n");
} finally {
  child.kill("SIGTERM");
  await Promise.race([once(child, "exit"), new Promise((resolvePromise) => setTimeout(resolvePromise, 2_000))]);
  await rm(usageDirectory, { recursive: true, force: true });
}
