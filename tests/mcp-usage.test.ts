import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  MCP_USAGE_MINIMUM_PUBLIC_COHORT,
  MCP_USAGE_RETENTION_DAYS,
  MCP_USAGE_SCHEMA_VERSION,
  aggregateMcpUsage,
  buildPublicMcpUsageReport,
  createMcpUsageStore,
  extractMcpUsageEvents,
  isInternalPaCheckRequest,
} from "../src/mcp/usage-telemetry.ts";

const emptyState = () => ({ schemaVersion: MCP_USAGE_SCHEMA_VERSION, updatedAt: null, days: [] });

const initialize = (name: string) => ({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { clientInfo: { name, version: "secret-version" } },
});

const toolCall = (name = "answer_question") => ({
  jsonrpc: "2.0",
  id: 2,
  method: "tools/call",
  params: { name, arguments: { question: "contenu qui ne doit jamais être stocké" } },
});

test("la télémétrie ne conserve que des événements et familles bornés", () => {
  assert.deepEqual(extractMcpUsageEvents(initialize("Claude Desktop 99.4")), [
    { type: "initialize", clientFamily: "anthropic" },
  ]);
  assert.deepEqual(extractMcpUsageEvents(toolCall("answer_question")), [
    { type: "tool_call", toolName: "answer_question" },
  ]);
  assert.deepEqual(extractMcpUsageEvents(toolCall("outil-inconnu-et-libre")), [
    { type: "tool_call", toolName: "unknown" },
  ]);
  assert.equal(isInternalPaCheckRequest("curl/8", initialize("pa-check-deploy-smoke")), true);
  assert.equal(isInternalPaCheckRequest("pa-check-monitor/1", toolCall()), true);
  assert.equal(isInternalPaCheckRequest("curl/8", initialize("Claude Desktop")), false);
});

test("le rapport public mesure les jours actifs sans fabriquer de clients uniques", () => {
  let state: unknown = aggregateMcpUsage(emptyState(), {
    body: initialize("Client très spécifique qui ne doit pas sortir"),
    durationMs: 21,
    statusCode: 200,
  }, new Date("2026-08-27T10:00:00Z"));
  state = aggregateMcpUsage(state, {
    body: toolCall(),
    durationMs: 61,
    statusCode: 200,
  }, new Date("2026-08-27T10:01:00Z"));
  state = aggregateMcpUsage(state, {
    body: toolCall("get_platform"),
    durationMs: 280,
    statusCode: 500,
  }, new Date("2026-08-28T10:00:00Z"));

  const report = buildPublicMcpUsageReport(state);
  assert.equal(report.window.retention_days, MCP_USAGE_RETENTION_DAYS);
  assert.equal(report.minimum_public_cohort, MCP_USAGE_MINIMUM_PUBLIC_COHORT);
  assert.equal(report.totals.requests, 3);
  assert.equal(report.totals.tool_calls, 2);
  assert.equal(report.totals.transport_success_rate, 0.666667);
  assert.equal(report.recurring_usage.active_days, 2);
  assert.equal(report.recurring_usage.repeat_active_days, 1);
  assert.equal(report.recurring_usage.returning_clients, null);
  assert.equal(report.updated_at, null);
  assert.equal(report.window.first_public_day, null);
  assert.equal(report.recurring_usage.first_public_active_day, null);
  assert.deepEqual(report.clients, []);
  assert.deepEqual(report.daily, []);
  assert.doesNotMatch(JSON.stringify(state), /Client très spécifique|secret-version|contenu qui ne doit jamais être stocké/);
});

test("les séries quotidiennes ne sortent qu'à partir du seuil k=5", () => {
  let state: unknown = emptyState();
  for (let index = 0; index < MCP_USAGE_MINIMUM_PUBLIC_COHORT; index += 1) {
    state = aggregateMcpUsage(state, {
      body: toolCall(index % 2 ? "get_platform" : "answer_question"),
      durationMs: 40 + index,
      statusCode: 200,
    }, new Date(`2026-08-28T10:00:0${index}Z`));
  }
  const report = buildPublicMcpUsageReport(state);
  assert.equal(report.daily.length, 1);
  assert.equal(report.daily[0]?.tool_calls, MCP_USAGE_MINIMUM_PUBLIC_COHORT);
  assert.equal(report.updated_at, "2026-08-28");
  assert.equal(report.window.first_public_day, "2026-08-28");
  assert.equal(report.recurring_usage.first_public_active_day, "2026-08-28");
});

test("le stockage privé est atomique et exclut les sondes internes avant agrégation", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pa-check-usage-"));
  const path = join(directory, "usage.json");
  const now = Date.parse("2026-08-28T12:00:00Z");
  const store = createMcpUsageStore({ path, now: () => now, flushIntervalMs: 0 });
  store.recordRequest({
    body: initialize("pa-check-deploy-smoke"),
    durationMs: 12,
    statusCode: 200,
    userAgent: "curl/8",
  });
  store.recordRequest({
    body: toolCall("search_official_directory"),
    durationMs: 31,
    statusCode: 200,
    userAgent: "Claude Desktop",
  });
  await store.flush();
  const report = await store.publicReport();
  assert.equal(report.enabled, true);
  assert.equal(report.storage_healthy, true);
  assert.equal(report.totals.requests, 1);
  assert.equal(report.totals.tool_calls, 1);
  const persisted = JSON.parse(await readFile(path, "utf8"));
  assert.equal(persisted.days[0]?.requests, 1);
});

test("la page agents et le déploiement publient le contrat de confidentialité", async () => {
  const [page, clientScript, privacy, deployment, readme] = await Promise.all([
    readFile(new URL("../src/pages/agents.astro", import.meta.url), "utf8"),
    readFile(new URL("../public/scripts/mcp-usage.js", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/confidentialite.astro", import.meta.url), "utf8"),
    readFile(new URL("../deploy/setup-pa-check-mcp.sh", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
  ]);
  assert.match(page, /src="\/scripts\/mcp-usage\.js"/);
  assert.match(clientScript, /fetch\("\/api\/mcp\/usage"/);
  assert.match(page, /Jours actifs répétés/);
  assert.match(page, /sans identifiant persistant/);
  assert.match(privacy, /Statistiques MCP anonymisées/);
  assert.match(privacy, /seuil de confidentialité k=5/);
  assert.match(deployment, /StateDirectory=pa-check-mcp/);
  assert.match(deployment, /PA_CHECK_MCP_USAGE_FILE=\/var\/lib\/pa-check-mcp\/usage\.json/);
  assert.match(readme, /api\/mcp\/usage/);
});
