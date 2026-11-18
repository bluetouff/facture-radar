import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const severities = ["info", "low", "moderate", "high", "critical"];
const advisoryUrl = /^https:\/\/github\.com\/advisories\/(GHSA-[23456789cfghjmpqrvwx]{4}-[23456789cfghjmpqrvwx]{4}-[23456789cfghjmpqrvwx]{4})$/;
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const fail = message => { throw new Error(message); };
const utcDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value.replace("Z", ".000Z")
  ? Date.parse(value) : NaN;

// No local exception list: a withdrawal must be confirmed afresh for every run.
export async function assessAudit(report, readAdvisory, { exitCode, now = Date.now() }) {
  if (![0, 1].includes(exitCode) || !object(report) || report.error || report.auditReportVersion !== 2
    || !object(report.vulnerabilities) || !object(report.metadata?.vulnerabilities)) {
    fail("Rapport npm invalide ou audit indisponible.");
  }
  const entries = Object.entries(report.vulnerabilities);
  if (entries.length > 1000) fail("Rapport npm trop volumineux.");
  const counts = Object.fromEntries(severities.map(severity => [severity, 0]));
  for (const [name, entry] of entries) {
    if (!object(entry) || entry.name !== name || !severities.includes(entry.severity)
      || !Array.isArray(entry.via) || entry.via.length === 0) fail("Graphe npm incomplet.");
    counts[entry.severity]++;
  }
  for (const [name, entry] of entries) {
    for (const via of entry.via) {
      const cause = typeof via === "string"
        ? Object.hasOwn(report.vulnerabilities, via) && report.vulnerabilities[via] : via;
      if (!object(cause) || !severities.includes(cause.severity)
        || (typeof via !== "string" && cause.name !== name)
        || severities.indexOf(cause.severity) > severities.indexOf(entry.severity)) {
        fail("Sévérités ou dépendances npm incohérentes.");
      }
    }
  }
  const totals = report.metadata.vulnerabilities;
  if (totals.total !== entries.length || severities.some(severity => totals[severity] !== counts[severity])) {
    fail("Totaux npm incohérents.");
  }
  const blocking = entries.filter(([, entry]) => severities.indexOf(entry.severity) >= 2);
  if (exitCode !== (blocking.length ? 1 : 0)) fail("Code de sortie npm incohérent.");
  if (!blocking.length) return { blockingPackages: 0, withdrawnIds: [] };

  const leaves = new Map();
  const visited = new Set();
  function visit(name, path = new Set()) {
    if (path.has(name) || path.size > 32) fail("Graphe npm cyclique ou trop profond.");
    if (visited.has(name)) return;
    const entry = Object.hasOwn(report.vulnerabilities, name) && report.vulnerabilities[name];
    if (!entry) fail("Dépendance absente du graphe npm.");
    const next = new Set([...path, name]);
    for (const via of entry.via) {
      if (typeof via === "string") { visit(via, next); continue; }
      if (!object(via) || via.name !== name || !severities.includes(via.severity) || typeof via.url !== "string") {
        fail("Avis npm non identifiable.");
      }
      const id = advisoryUrl.exec(via.url)?.[1];
      if (!id) fail("Origine de l’avis npm non reconnue.");
      if (!leaves.has(id)) leaves.set(id, new Set());
      leaves.get(id).add(name);
      if (leaves.size > 32) fail("Trop d’avis à vérifier.");
    }
    visited.add(name);
  }
  for (const [name] of blocking) visit(name);

  for (const [id, packages] of leaves) {
    const advisory = await readAdvisory(id);
    const withdrawn = utcDate(advisory?.withdrawn_at);
    const updated = utcDate(advisory?.updated_at);
    if (!object(advisory) || advisory.ghsa_id !== id || !Number.isFinite(withdrawn)
      || withdrawn > now || !Number.isFinite(updated) || updated < withdrawn || updated > now
      || !Array.isArray(advisory.vulnerabilities)
      || [...packages].some(name => !advisory.vulnerabilities.some(item =>
        item?.package?.ecosystem === "npm" && item.package.name === name))) {
      fail(`Avis actif ou retrait invérifiable : ${id}.`);
    }
  }
  return { blockingPackages: blocking.length, withdrawnIds: [...leaves.keys()] };
}

export async function readGitHubAdvisory(id) {
  if (!/^GHSA-[23456789cfghjmpqrvwx]{4}-[23456789cfghjmpqrvwx]{4}-[23456789cfghjmpqrvwx]{4}$/.test(id)) {
    fail("Identifiant d’avis invalide.");
  }
  const response = await fetch(`https://api.github.com/advisories/${id}`, {
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
    headers: { Accept: "application/vnd.github+json", "Cache-Control": "no-cache" },
  });
  if (!response.ok || !response.body) fail("Vérification GitHub indisponible.");
  let size = 0;
  const chunks = [];
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > 131_072) fail("Réponse GitHub trop volumineuse.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function main() {
  const npm = process.env.npm_execpath;
  if (!npm) fail("Lancer ce contrôle avec npm run audit:check.");
  const audit = spawnSync(process.execPath, [npm, "audit", "--json", "--audit-level=moderate"], {
    encoding: "utf8", timeout: 60_000, maxBuffer: 4 * 1024 * 1024, shell: false,
  });
  if (audit.error || audit.signal) fail("Exécution de npm audit interrompue.");
  const result = await assessAudit(JSON.parse(audit.stdout), readGitHubAdvisory, { exitCode: audit.status });
  if (result.withdrawnIds.length) {
    console.log(`NPM_WITHDRAWAL_VERIFIED packages=${result.blockingPackages} advisories=${result.withdrawnIds.join(",")}`);
  } else {
    console.log("NPM_AUDIT_OK : aucun avis actif de niveau moderate ou supérieur.");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    console.error("NPM_AUDIT_FAILED : alerte active, rapport invalide ou retrait non vérifiable. Consulter npm audit et les avis GitHub.");
    process.exitCode = 1;
  });
}
