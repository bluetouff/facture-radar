import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export const MCP_USAGE_SCHEMA_VERSION = "1.0.0";
export const MCP_USAGE_RETENTION_DAYS = 91;
export const MCP_USAGE_MINIMUM_PUBLIC_COHORT = 5;

const LATENCY_BUCKETS_MS = [10, 25, 50, 100, 250, 500, 1_000, 2_500, 5_000, 15_000] as const;
const KNOWN_TOOLS = new Set([
  "answer_question",
  "get_platform",
  "find_platforms",
  "search_official_directory",
  "get_corpus_status",
]);
const CLIENT_FAMILIES = [
  ["anthropic", /\b(?:claude|anthropic)\b/i],
  ["openai", /\b(?:chatgpt|codex|openai)\b|agents[ _-]?sdk/i],
  ["google", /\b(?:gemini|vertex ai)\b/i],
  ["mcp-inspector", /\bmcp[ _-]?inspector\b/i],
  ["mcp-gateway", /\b(?:mcp[ _-]?remote|mcp[ _-]?proxy|supergateway|smithery)\b/i],
  ["ide", /\b(?:cursor|vscode|visual studio code|windsurf|zed)\b/i],
  ["generic-http", /\b(?:curl|httpie|wget|postman|insomnia)\b/i],
  ["automation", /\b(?:n8n|make\.com|zapier|langchain|llamaindex)\b/i],
] as const;
const CLIENT_FAMILY_NAMES = new Set([...CLIENT_FAMILIES.map(([family]) => family), "other", "undeclared"]);
const INTERNAL_CLIENT_PATTERN = /^(?:pa[-_. ]?check)(?:[./ _-]|$).*(?:deploy|smoke|monitor|health|internal)/i;

type CountRow<Key extends string> = Record<Key, string> & { count: number };
type UsageEvent =
  | { type: "initialize"; clientFamily: string }
  | { type: "tools_list" }
  | { type: "tool_call"; toolName: string }
  | { type: "resource_read" };

interface DailyUsage {
  day: string;
  requests: number;
  transportSuccesses: number;
  transportErrors: number;
  events: {
    initializations: number;
    toolsList: number;
    toolCalls: number;
    resourceReads: number;
  };
  clients: Array<CountRow<"family">>;
  tools: Array<CountRow<"name">>;
  latencyHistogram: number[];
}

interface UsageState {
  schemaVersion: typeof MCP_USAGE_SCHEMA_VERSION;
  updatedAt: string | null;
  days: DailyUsage[];
}

interface UsageObservation {
  body: unknown;
  durationMs: number;
  statusCode: number;
  userAgent?: string | string[];
}

function emptyHistogram(): number[] {
  return LATENCY_BUCKETS_MS.map(() => 0);
}

function emptyDay(day: string): DailyUsage {
  return {
    day,
    requests: 0,
    transportSuccesses: 0,
    transportErrors: 0,
    events: { initializations: 0, toolsList: 0, toolCalls: 0, resourceReads: 0 },
    clients: [],
    tools: [],
    latencyHistogram: emptyHistogram(),
  };
}

function emptyState(): UsageState {
  return { schemaVersion: MCP_USAGE_SCHEMA_VERSION, updatedAt: null, days: [] };
}

function isCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function validRows<Key extends string>(value: unknown, key: Key, allowed: Set<string>): value is Array<CountRow<Key>> {
  return Array.isArray(value) && value.every((row) => (
    row && typeof row === "object"
    && typeof (row as Record<string, unknown>)[key] === "string"
    && allowed.has((row as Record<string, string>)[key] ?? "")
    && isCount((row as Record<string, unknown>).count)
  ));
}

function normalizeState(value: unknown): UsageState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.schemaVersion !== MCP_USAGE_SCHEMA_VERSION || !Array.isArray(candidate.days)) return null;
  if (candidate.updatedAt !== null && (typeof candidate.updatedAt !== "string" || Number.isNaN(Date.parse(candidate.updatedAt)))) return null;
  const toolNames = new Set([...KNOWN_TOOLS, "unknown"]);
  const days: DailyUsage[] = [];
  for (const rawDay of candidate.days) {
    if (!rawDay || typeof rawDay !== "object" || Array.isArray(rawDay)) return null;
    const day = rawDay as Record<string, unknown>;
    if (typeof day.day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day.day)) return null;
    if (![day.requests, day.transportSuccesses, day.transportErrors].every(isCount)) return null;
    if (Number(day.transportSuccesses) + Number(day.transportErrors) !== Number(day.requests)) return null;
    if (!day.events || typeof day.events !== "object" || Array.isArray(day.events)) return null;
    const events = day.events as Record<string, unknown>;
    if (![events.initializations, events.toolsList, events.toolCalls, events.resourceReads].every(isCount)) return null;
    if (!validRows(day.clients, "family", CLIENT_FAMILY_NAMES) || !validRows(day.tools, "name", toolNames)) return null;
    if (!Array.isArray(day.latencyHistogram)
      || day.latencyHistogram.length !== LATENCY_BUCKETS_MS.length
      || !day.latencyHistogram.every(isCount)) return null;
    days.push({
      day: day.day,
      requests: Number(day.requests),
      transportSuccesses: Number(day.transportSuccesses),
      transportErrors: Number(day.transportErrors),
      events: {
        initializations: Number(events.initializations),
        toolsList: Number(events.toolsList),
        toolCalls: Number(events.toolCalls),
        resourceReads: Number(events.resourceReads),
      },
      clients: structuredClone(day.clients),
      tools: structuredClone(day.tools),
      latencyHistogram: [...day.latencyHistogram] as number[],
    });
  }
  days.sort((left, right) => left.day.localeCompare(right.day));
  return {
    schemaVersion: MCP_USAGE_SCHEMA_VERSION,
    updatedAt: candidate.updatedAt as string | null,
    days,
  };
}

function classifyClient(clientInfo: unknown): string {
  if (!clientInfo || typeof clientInfo !== "object" || Array.isArray(clientInfo)) return "undeclared";
  const name = (clientInfo as Record<string, unknown>).name;
  if (typeof name !== "string" || !name.trim()) return "undeclared";
  return CLIENT_FAMILIES.find(([, pattern]) => pattern.test(name.slice(0, 120)))?.[0] ?? "other";
}

function classifyTool(name: unknown): string {
  return typeof name === "string" && KNOWN_TOOLS.has(name) ? name : "unknown";
}

function messages(body: unknown): Array<Record<string, unknown>> {
  const values = Array.isArray(body) ? body : [body];
  return values.filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value));
}

export function extractMcpUsageEvents(body: unknown): UsageEvent[] {
  const events: UsageEvent[] = [];
  for (const message of messages(body)) {
    const params = message.params && typeof message.params === "object" && !Array.isArray(message.params)
      ? message.params as Record<string, unknown>
      : {};
    if (message.method === "initialize") events.push({ type: "initialize", clientFamily: classifyClient(params.clientInfo) });
    else if (message.method === "tools/list") events.push({ type: "tools_list" });
    else if (message.method === "tools/call") events.push({ type: "tool_call", toolName: classifyTool(params.name) });
    else if (message.method === "resources/read") events.push({ type: "resource_read" });
  }
  return events;
}

export function isInternalPaCheckRequest(userAgent: unknown, body: unknown): boolean {
  const header = Array.isArray(userAgent) ? userAgent.join(" ") : userAgent;
  if (typeof header === "string" && INTERNAL_CLIENT_PATTERN.test(header.slice(0, 160))) return true;
  return messages(body).some((message) => {
    if (message.method !== "initialize" || !message.params || typeof message.params !== "object" || Array.isArray(message.params)) return false;
    const clientInfo = (message.params as Record<string, unknown>).clientInfo;
    if (!clientInfo || typeof clientInfo !== "object" || Array.isArray(clientInfo)) return false;
    const name = (clientInfo as Record<string, unknown>).name;
    return typeof name === "string" && INTERNAL_CLIENT_PATTERN.test(name.slice(0, 160));
  });
}

function incrementRow<Key extends string>(rows: Array<CountRow<Key>>, key: Key, value: string): void {
  let row = rows.find((item) => item[key] === value);
  if (!row) {
    row = { [key]: value, count: 0 } as CountRow<Key>;
    rows.push(row);
  }
  row.count += 1;
  rows.sort((left, right) => left[key].localeCompare(right[key]));
}

function incrementHistogram(histogram: number[], value: number): void {
  const duration = Math.max(0, Number.isFinite(value) ? value : 0);
  let index = LATENCY_BUCKETS_MS.findIndex((upperBound) => duration <= upperBound);
  if (index < 0) index = LATENCY_BUCKETS_MS.length - 1;
  histogram[index] = (histogram[index] ?? 0) + 1;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function aggregateMcpUsage(state: unknown, observation: UsageObservation, now = new Date()): UsageState {
  const current = normalizeState(state);
  if (!current || !Number.isFinite(now.getTime())) throw new Error("mcp_usage_schema_mismatch");
  const next = structuredClone(current);
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  cutoff.setUTCDate(cutoff.getUTCDate() - (MCP_USAGE_RETENTION_DAYS - 1));
  next.days = next.days.filter((day) => Date.parse(`${day.day}T00:00:00Z`) >= cutoff.getTime());
  let day = next.days.find((item) => item.day === dayKey(now));
  if (!day) {
    day = emptyDay(dayKey(now));
    next.days.push(day);
    next.days.sort((left, right) => left.day.localeCompare(right.day));
  }
  day.requests += 1;
  if (observation.statusCode >= 200 && observation.statusCode < 400) day.transportSuccesses += 1;
  else day.transportErrors += 1;
  incrementHistogram(day.latencyHistogram, observation.durationMs);
  for (const event of extractMcpUsageEvents(observation.body)) {
    if (event.type === "initialize") {
      day.events.initializations += 1;
      incrementRow(day.clients, "family", CLIENT_FAMILY_NAMES.has(event.clientFamily) ? event.clientFamily : "other");
    } else if (event.type === "tools_list") day.events.toolsList += 1;
    else if (event.type === "tool_call") {
      day.events.toolCalls += 1;
      incrementRow(day.tools, "name", event.toolName);
    } else if (event.type === "resource_read") day.events.resourceReads += 1;
  }
  next.updatedAt = `${dayKey(now)}T00:00:00.000Z`;
  return next;
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? Number((numerator / denominator).toFixed(6)) : null;
}

function percentile(histogram: number[], quantile: number): number | null {
  const total = histogram.reduce((sum, count) => sum + count, 0);
  if (!total) return null;
  const rank = Math.ceil(total * quantile);
  let cumulative = 0;
  for (let index = 0; index < histogram.length; index += 1) {
    cumulative += histogram[index] ?? 0;
    if (cumulative >= rank) return LATENCY_BUCKETS_MS[index] ?? LATENCY_BUCKETS_MS.at(-1) ?? null;
  }
  return LATENCY_BUCKETS_MS.at(-1) ?? null;
}

function sumRows<Key extends string>(days: DailyUsage[], source: "clients" | "tools", key: Key): Array<CountRow<Key>> {
  const totals = new Map<string, number>();
  for (const day of days) {
    for (const row of day[source] as Array<CountRow<Key>>) totals.set(row[key], (totals.get(row[key]) ?? 0) + row.count);
  }
  return [...totals.entries()]
    .map(([value, count]) => ({ [key]: value, count }) as CountRow<Key>)
    .sort((left, right) => right.count - left.count || left[key].localeCompare(right[key]));
}

export function buildPublicMcpUsageReport(state: unknown, minimumCohort = MCP_USAGE_MINIMUM_PUBLIC_COHORT) {
  const value = normalizeState(state);
  if (!value || !Number.isSafeInteger(minimumCohort) || minimumCohort < 2) throw new Error("mcp_usage_schema_mismatch");
  const totals = value.days.reduce((summary, day) => {
    summary.requests += day.requests;
    summary.transportSuccesses += day.transportSuccesses;
    summary.transportErrors += day.transportErrors;
    summary.initializations += day.events.initializations;
    summary.toolsList += day.events.toolsList;
    summary.toolCalls += day.events.toolCalls;
    summary.resourceReads += day.events.resourceReads;
    day.latencyHistogram.forEach((count, index) => { summary.latencyHistogram[index] = (summary.latencyHistogram[index] ?? 0) + count; });
    return summary;
  }, {
    requests: 0,
    transportSuccesses: 0,
    transportErrors: 0,
    initializations: 0,
    toolsList: 0,
    toolCalls: 0,
    resourceReads: 0,
    latencyHistogram: emptyHistogram(),
  });
  const activeDays = value.days.filter((day) => day.events.toolCalls > 0);
  const publicDays = value.days.filter((day) => day.requests >= minimumCohort || day.events.toolCalls >= minimumCohort);
  const publicActiveDays = value.days.filter((day) => day.events.toolCalls >= minimumCohort);
  return {
    schema_version: MCP_USAGE_SCHEMA_VERSION,
    updated_at: publicDays.at(-1)?.day ?? null,
    window: {
      retention_days: MCP_USAGE_RETENTION_DAYS,
      first_public_day: publicDays.at(0)?.day ?? null,
      last_public_day: publicDays.at(-1)?.day ?? null,
    },
    minimum_public_cohort: minimumCohort,
    measurement: {
      requests: "Requêtes MCP agrégées par jour ; aucun contenu de requête ou de réponse n'est conservé.",
      latency: "p50 et p95 estimés depuis des histogrammes bornés ; aucune durée individuelle n'est conservée.",
      clients: "Famille stable dérivée de clientInfo.name lors de l'initialisation ; aucun nom libre n'est conservé.",
      privacy: "Aucune IP, session, empreinte, cookie ou chaîne user-agent n'est conservée. Les sondes PA Check sont exclues avant agrégation.",
    },
    totals: {
      requests: totals.requests,
      transport_successes: totals.transportSuccesses,
      transport_errors: totals.transportErrors,
      transport_success_rate: ratio(totals.transportSuccesses, totals.requests),
      initializations: totals.initializations,
      tools_list: totals.toolsList,
      tool_calls: totals.toolCalls,
      resource_reads: totals.resourceReads,
      latency_ms: {
        p50: percentile(totals.latencyHistogram, 0.5),
        p95: percentile(totals.latencyHistogram, 0.95),
      },
    },
    recurring_usage: {
      metric: "repeat_active_days",
      active_days: activeDays.length,
      repeat_active_days: Math.max(0, activeDays.length - 1),
      first_public_active_day: publicActiveDays.at(0)?.day ?? null,
      last_public_active_day: publicActiveDays.at(-1)?.day ?? null,
      returning_clients: null,
    },
    clients: sumRows(value.days, "clients", "family").filter((row) => row.count >= minimumCohort),
    tools: sumRows(value.days, "tools", "name"),
    daily: publicDays.map((day) => ({
      date: day.day,
      requests: day.requests,
      tool_calls: day.events.toolCalls,
      latency_ms: { p95: percentile(day.latencyHistogram, 0.95) },
    })),
    limitations: [
      "La mesure commence à l'activation de cette instrumentation et ne reconstitue pas le passé.",
      "Les tentatives et retries peuvent augmenter les compteurs.",
      "Les séries quotidiennes et familles client sous le seuil k=5 sont masquées.",
      "La date du dernier appel reste masquée tant qu'aucun jour n'atteint le seuil k=5.",
      "Aucune donnée ne permet de compter des personnes ou des intégrations uniques.",
      "returning_clients reste null : la récurrence porte sur les jours actifs, sans identifiant persistant.",
    ],
  };
}

async function loadState(path: string | null): Promise<UsageState> {
  if (!path) return emptyState();
  try {
    const normalized = normalizeState(JSON.parse(await readFile(path, "utf8")));
    if (!normalized) throw new Error("mcp_usage_schema_mismatch");
    return normalized;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyState();
    throw error;
  }
}

async function persistState(path: string, state: UsageState): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state)}\n`, { mode: 0o600 });
  await rename(temporary, path);
}

export function createMcpUsageStore({
  path,
  now = Date.now,
  minimumCohort = MCP_USAGE_MINIMUM_PUBLIC_COHORT,
  flushIntervalMs = 500,
  onError = () => undefined,
}: {
  path?: string;
  now?: () => number;
  minimumCohort?: number;
  flushIntervalMs?: number;
  onError?: (error: unknown) => void;
} = {}) {
  const enabled = typeof path === "string" && path.length > 0;
  let lastError: unknown = null;
  let statePromise = loadState(enabled ? path : null).catch((error) => {
    lastError = error;
    onError(error);
    return emptyState();
  });
  let queue = Promise.resolve();
  let pending: UsageObservation[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  function enqueue(observations: UsageObservation[]): void {
    if (!enabled || !path || observations.length === 0 || lastError) return;
    queue = queue.then(async () => {
      let state = await statePromise;
      for (const observation of observations) state = aggregateMcpUsage(state, observation, new Date(now()));
      await persistState(path, state);
      statePromise = Promise.resolve(state);
    }).catch((error) => {
      lastError = error;
      onError(error);
    });
  }

  function drain(): void {
    if (timer) clearTimeout(timer);
    timer = null;
    const observations = pending;
    pending = [];
    enqueue(observations);
  }

  return {
    enabled,
    recordRequest(observation: UsageObservation): void {
      if (!enabled || lastError || isInternalPaCheckRequest(observation.userAgent, observation.body)) return;
      pending.push(observation);
      if (!timer) {
        timer = setTimeout(drain, flushIntervalMs);
        timer.unref?.();
      }
    },
    async flush(): Promise<void> {
      drain();
      await queue;
    },
    async publicReport() {
      drain();
      await queue;
      return {
        enabled,
        storage_healthy: lastError === null,
        ...buildPublicMcpUsageReport(await statePromise, minimumCohort),
      };
    },
  };
}
