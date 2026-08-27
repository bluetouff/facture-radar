#!/usr/bin/env node

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import officialDirectory from "../src/data/official-directory.json" with { type: "json" };
import { platforms } from "../src/data/platforms.ts";
import { isForbiddenHostname, startPinnedHttpsProxy } from "./lib/public-egress-proxy.mjs";

const TRACKER_RADAR_REVISION = "a1d894db2312f3fdeea06d6c784739b97eb727c8";
const CHROME_DEFAULT = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const WAIT_AFTER_LOAD_MS = 4_000;
const MAX_OBSERVATION_MS = 15_000;
const TRACKING_CATEGORIES = new Set([
  "Action Pixels",
  "Ad Motivated Tracking",
  "Advertising",
  "Analytics",
  "Audience Measurement",
  "Session Replay",
  "Tag Manager",
  "Third-Party Analytics Marketing",
]);

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

const slug = argument("slug");
if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  throw new Error("Usage : node scripts/observe-public-site-trackers.mjs --slug <slug>");
}

const platform = platforms.find((candidate) => candidate.slug === slug);
if (!platform) throw new Error(`Plateforme inconnue : ${slug}`);
const officialEntry = officialDirectory.approved.find((entry) => entry.name === platform.officialName);
if (!officialEntry) throw new Error(`Entrée officielle absente : ${platform.officialName}`);

const target = new URL(officialEntry.website);
if (target.protocol !== "https:") throw new Error("Le scanner refuse toute URL non HTTPS");
if (isForbiddenHostname(target.hostname)) {
  throw new Error("Le scanner refuse les hôtes locaux ou adressés directement par IP");
}

function baseDomain(hostname) {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  const labels = host.split(".");
  const compoundSuffixes = new Set(["co.uk", "org.uk", "com.au", "com.br", "com.cn", "co.jp", "co.nz"]);
  const suffix = labels.slice(-2).join(".");
  return labels.length > 2 && compoundSuffixes.has(suffix) ? labels.slice(-3).join(".") : labels.slice(-2).join(".");
}

function isSameParty(candidate, firstParty) {
  return candidate === firstParty || candidate.endsWith(`.${firstParty}`);
}

class CdpConnection {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      for (const listener of this.listeners.get(message.method) ?? []) listener(message.params);
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  close() {
    this.socket.close();
  }
}

async function startChrome(profileDirectory, proxyUrl) {
  const chrome = process.env.PA_CHECK_CHROME_BIN ?? CHROME_DEFAULT;
  const child = spawn(chrome, [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profileDirectory}`,
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-quic",
    "--disable-webrtc",
    "--disable-sync",
    "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
    `--proxy-server=${proxyUrl}`,
    "--proxy-bypass-list=<-loopback>",
    "--no-default-browser-check",
    "--no-first-run",
    "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });

  try {
    const browserWs = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Chrome n'a pas ouvert son port de débogage")), 8_000);
      let buffer = "";
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk) => {
        buffer += chunk;
        const match = buffer.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (!match) return;
        clearTimeout(timer);
        resolve(match[1]);
      });
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`Chrome s'est arrêté avant l'observation (${code})`));
      });
    });

    const browserUrl = new URL(browserWs);
    const listUrl = `http://${browserUrl.hostname}:${browserUrl.port}/json/list`;
    const pages = await fetch(listUrl).then((response) => response.json());
    const page = pages.find((candidate) => candidate.type === "page");
    if (!page?.webSocketDebuggerUrl) throw new Error("Aucune page Chrome contrôlable");
    return { child, pageWs: page.webSocketDebuggerUrl };
  } catch (error) {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await Promise.race([
        once(child, "exit"),
        new Promise((resolve) => setTimeout(resolve, 2_000)),
      ]);
    }
    throw error;
  }
}

async function trackerRadarRecord(domain) {
  const url = `https://raw.githubusercontent.com/duckduckgo/tracker-radar/${TRACKER_RADAR_REVISION}/domains/FR/${encodeURIComponent(domain)}.json`;
  const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Tracker Radar ${response.status} pour ${domain}`);
  return response.json();
}

const profileDirectory = await mkdtemp(join(tmpdir(), "pa-check-observation-"));
let chrome;
let cdp;
let egressProxy;

try {
  egressProxy = await startPinnedHttpsProxy();
  chrome = await startChrome(profileDirectory, egressProxy.url);
  cdp = new CdpConnection(chrome.pageWs);
  await cdp.open();
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Page.enable");
  await cdp.send("Fetch.enable", { patterns: [{ urlPattern: "*" }] });

  const requestUrls = new Set();
  let loaded = false;
  let finalUrl = target.href;
  cdp.on("Network.requestWillBeSent", ({ request }) => {
    if (request?.url) requestUrls.add(request.url);
  });
  cdp.on("Fetch.requestPaused", ({ requestId, request }) => {
    let forbidden = false;
    try {
      const parsed = new URL(request.url);
      forbidden = (parsed.protocol === "http:" || parsed.protocol === "https:") && isForbiddenHostname(parsed.hostname);
    } catch {
      forbidden = false;
    }
    void cdp.send(forbidden ? "Fetch.failRequest" : "Fetch.continueRequest", forbidden
      ? { requestId, errorReason: "BlockedByClient" }
      : { requestId }).catch(() => {});
  });
  cdp.on("Page.loadEventFired", () => { loaded = true; });
  cdp.on("Page.frameNavigated", ({ frame }) => {
    if (!frame.parentId && frame.url?.startsWith("http")) finalUrl = frame.url;
  });

  await cdp.send("Page.navigate", { url: target.href, transitionType: "typed" });
  const startedAt = Date.now();
  while (!loaded && Date.now() - startedAt < MAX_OBSERVATION_MS) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  await new Promise((resolve) => setTimeout(resolve, WAIT_AFTER_LOAD_MS));

  const finalTarget = new URL(finalUrl);
  if (finalTarget.protocol !== "https:" || isForbiddenHostname(finalTarget.hostname)) {
    throw new Error("La redirection finale ne respecte pas les règles de sécurité du scanner");
  }

  const firstParty = baseDomain(finalTarget.hostname);
  const thirdPartyDomains = [...new Set([...requestUrls].flatMap((requestUrl) => {
    try {
      const parsed = new URL(requestUrl);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return [];
      const domain = baseDomain(parsed.hostname);
      return isSameParty(domain, firstParty) ? [] : [domain];
    } catch {
      return [];
    }
  }))].sort();

  const trackers = (await Promise.all(thirdPartyDomains.map(async (domain) => {
    const record = await trackerRadarRecord(domain);
    if (!record) return null;
    const categories = Array.isArray(record.categories) ? record.categories : [];
    if (!categories.some((category) => TRACKING_CATEGORIES.has(category))) return null;
    return {
      domain,
      entity: record.owner?.displayName ?? record.owner?.name ?? domain,
      categories,
      source: "DuckDuckGo Tracker Radar",
    };
  }))).filter((tracker) => tracker !== null);

  process.stdout.write(`${JSON.stringify({
    platformSlug: slug,
    status: "observed",
    scanUrl: target.href,
    finalUrl,
    checkedAt: new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date()),
    consentState: "before-choice",
    methodologyVersion: "1.0",
    trackerRadarRevision: TRACKER_RADAR_REVISION,
    trackers,
    thirdPartyDomains,
    note: "Chargement unique de la page publique dans un profil Chrome neuf, sans accepter ni refuser le bandeau de consentement. Observation ponctuelle, à ne pas confondre avec l'application ou l'hébergement des factures.",
  }, null, 2)}\n`);
} finally {
  cdp?.close();
  if (chrome?.child && chrome.child.exitCode === null) {
    chrome.child.kill("SIGTERM");
    await Promise.race([
      once(chrome.child, "exit"),
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ]);
  }
  await egressProxy?.close();
  await rm(profileDirectory, { recursive: true, force: true, maxRetries: 4, retryDelay: 150 });
}
