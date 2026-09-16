// Read public notices only. Output is an untrusted review queue, never published data.
import { get } from "node:https";
import { mkdir, readFile, rename, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { resolvePinnedPublicAddress } from "./lib/public-egress-proxy.mjs";
import { watchSources, FEED_LIMIT, assertWatchSource, parseWatchSource, compareCandidates, digest } from "./lib/incident-feeds.mjs";

async function fetchSource(source) {
  assertWatchSource(source);
  const url = new URL(source.url);
  const pinned = await resolvePinnedPublicAddress(url.hostname);
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let bytes = 0;
    const request = get(url, {
      autoSelectFamily: false,
      headers: { "User-Agent": "PA-Check-public-status-review/1.0", "Accept": source.kind === "json" ? "application/json" : ["rss", "atom"].includes(source.kind) ? "application/rss+xml, application/atom+xml, application/xml, text/xml" : "text/html", "Accept-Encoding": "identity" },
      lookup: (_host, _options, callback) => callback(null, pinned.address, pinned.family),
    }, response => {
      if (response.statusCode !== 200) { response.resume(); request.destroy(new Error(`HTTP ${response.statusCode}; redirections non suivies`)); return; }
      response.on("data", chunk => {
        bytes += chunk.length;
        if (bytes > FEED_LIMIT) request.destroy(new Error("Limite de réponse dépassée"));
        else chunks.push(chunk);
      });
      response.on("error", reject);
      response.on("end", () => { clearTimeout(timer); resolveBody(Buffer.concat(chunks).toString("utf8")); });
    });
    const timer = setTimeout(() => request.destroy(new Error("Source hors délai")), 20_000);
    request.on("error", error => { clearTimeout(timer); reject(error); });
  });
}

const directory = resolve("tmp/incident-watch");
await mkdir(directory, { recursive: true });
// A second collector must not overwrite the first one's pending queue or observations.
await mkdir(`${directory}/.collect-lock`).catch(() => { throw new Error("Collecte déjà en cours ; verrou à vérifier après un arrêt brutal"); });
try {
  let previous = { entries: {}, sources: {} };
  try { previous = JSON.parse(await readFile(`${directory}/state.json`, "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const checkedAt = new Date().toISOString();
  const runId = checkedAt.replace(/[:.]/g, "-");
  const archive = `${directory}/${runId}`;
  await mkdir(archive, { recursive: true });
  const results = [];
  for (let offset = 0; offset < watchSources.length; offset += 4) {
  results.push(...await Promise.allSettled(watchSources.slice(offset, offset + 4).map(async source => {
    const body = await fetchSource(source);
    await writeFile(`${archive}/${source.id}.${source.kind === "json" ? "json" : source.kind === "esker" ? "html" : "xml"}`, body);
    const candidates = parseWatchSource(source, body).map(candidate => ({ ...candidate, sourceId: source.id, platformSlugs: source.platformSlugs, classification: source.profile === "cert-fr" ? "security_advisory_to_review" : "publisher_notice_to_review" }));
    return { sourceId: source.id, url: source.url, status: "collected", checkedAt, sha256: digest(body), candidates };
  })));
  }
  const review = { checkedAt, initialCollection: Object.keys(previous.sources).length === 0, warning: "Contenu externe non fiable, à relire. Une collecte échouée ne constitue jamais un incident de la PA. Aucun candidat n’est publié automatiquement.", sources: [], changes: [] };
  for (const [index, result] of results.entries()) {
    const source = watchSources[index];
    if (result.status === "fulfilled") {
      const { candidates, ...metadata } = result.value;
      review.sources.push({ ...metadata, candidateCount: candidates.length });
      review.changes.push(...compareCandidates(previous.entries, candidates));
      previous.sources[source.id] = metadata;
      for (const candidate of candidates) previous.entries[candidate.id] = { ...candidate, firstObservedAt: previous.entries[candidate.id]?.firstObservedAt ?? checkedAt, lastObservedAt: checkedAt };
      // Missing items are retained: a rolling feed is not a retraction or resolution.
    } else {
      const failure = { sourceId: source.id, url: source.url, status: "failed", checkedAt, error: String(result.reason?.message ?? "Collecte échouée") };
      review.sources.push(failure);
      previous.sources[source.id] = failure;
    }
  }
  // Pending evidence survives a quiet collection; only a review can remove it.
  previous.pending ??= {};
  for (const change of review.changes) previous.pending[change.id] = { ...change, queuedAt: checkedAt };
  review.pendingCount = Object.keys(previous.pending).length;
  await writeFile(`${archive}/pending.json`, JSON.stringify(Object.values(previous.pending), null, 2) + "\n");
  await writeFile(`${archive}/review.json`, JSON.stringify(review, null, 2) + "\n");
  await writeFile(`${directory}/latest.json`, JSON.stringify(review, null, 2) + "\n");
  await writeFile(`${directory}/state.next.json`, JSON.stringify(previous, null, 2) + "\n");
  await rename(`${directory}/state.next.json`, `${directory}/state.json`);
  console.log(JSON.stringify({ checkedAt, reviewFile: `${archive}/review.json`, changesToReview: review.changes.length, pendingCount: review.pendingCount, sources: review.sources.map(({ sourceId, status, candidateCount, error }) => ({ sourceId, status, candidateCount, error })) }));
  if (review.sources.some(source => source.status === "failed")) process.exitCode = 1;
} finally {
  await rm(`${directory}/.collect-lock`, { recursive: true });
}
