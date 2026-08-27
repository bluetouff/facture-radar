import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { connect as connectTcp } from "node:net";
import test from "node:test";
import { MAX_FACTURX_XML_BYTES } from "../src/lib/invoice-verifier.ts";
import {
  buildBoundedPdfWorkerSource,
  MAX_PDF_ATTACHMENT_BYTES,
} from "../scripts/lib/bounded-pdf-worker.mjs";
import {
  isPublicIpAddress,
  resolvePinnedPublicAddress,
  startPinnedHttpsProxy,
} from "../scripts/lib/public-egress-proxy.mjs";

test("le worker PDF borne la lecture de la pièce jointe avant sa matérialisation", async () => {
  const generated = await readFile(new URL("../public/assets/pdf.worker.bounded-v1.mjs", import.meta.url), "utf8");
  const methodStart = generated.indexOf("  static readStreamContent(stream) {");
  const methodEnd = generated.indexOf("\n  }\n", methodStart);
  assert.ok(methodStart >= 0 && methodEnd > methodStart);
  const method = generated.slice(methodStart, methodEnd);
  assert.match(method, new RegExp(`stream\\.getBytes\\(${MAX_PDF_ATTACHMENT_BYTES + 1}\\)`));
  assert.match(method, new RegExp(`content\\.byteLength > ${MAX_PDF_ATTACHMENT_BYTES} \\? null`));
  assert.match(method, /allowedStreams/);
  assert.match(method, /currentStream\._paCheckAttachmentLimit/);
  assert.doesNotMatch(method, /return stream\.getBytes\(\);/);
  assert.match(generated, /if \(paCheckLimit && requested > paCheckLimit\)/);
  assert.doesNotMatch(method, /BrotliStream/);
  assert.equal(MAX_PDF_ATTACHMENT_BYTES, MAX_FACTURX_XML_BYTES);
});

test("la génération du worker échoue si le point d'ancrage PDF.js dérive", () => {
  assert.throws(() => buildBoundedPdfWorkerSource("export const worker = true;"), /PDF\.js/);
});

test("le filtre réseau distingue les adresses publiques des plages non routables", () => {
  assert.equal(isPublicIpAddress("93.184.216.34"), true);
  assert.equal(isPublicIpAddress("2606:4700:4700::1111"), true);
  for (const address of ["127.0.0.1", "169.254.1.2", "192.168.10.4", "::1", "fc00::1", "2001:db8::1"]) {
    assert.equal(isPublicIpAddress(address), false, address);
  }
});

test("la résolution est refusée si une seule réponse sort du réseau public", async () => {
  const mixedLookup = async () => [
    { address: "93.184.216.34", family: 4 as const },
    { address: "127.0.0.1", family: 4 as const },
  ];
  await assert.rejects(resolvePinnedPublicAddress("service.example", mixedLookup), /refusée/);
});

test("le proxy local refuse une destination non publique avant toute connexion", async () => {
  let outboundConnectionAttempted = false;
  const proxy = await startPinnedHttpsProxy({
    lookup: async () => [{ address: "127.0.0.1", family: 4 as const }],
    connect: (options) => {
      outboundConnectionAttempted = true;
      return connectTcp(options);
    },
  });
  const proxyUrl = new URL(proxy.url);
  const socket = connectTcp(Number(proxyUrl.port), proxyUrl.hostname);
  let response = "";
  socket.setEncoding("utf8");
  socket.on("data", (chunk) => { response += chunk; });
  try {
    await once(socket, "connect");
    socket.write("CONNECT service.example:443 HTTP/1.1\r\nHost: service.example:443\r\n\r\n");
    await Promise.race([
      once(socket, "close"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Réponse du proxy hors délai")), 2_000)),
    ]);
    assert.match(response, /^HTTP\/1\.1 403 /);
    assert.equal(outboundConnectionAttempted, false);
  } finally {
    socket.destroy();
    await proxy.close();
  }
});

test("le registre et le handshake publient les informations d'usage attendues", async () => {
  const metadata = JSON.parse(await readFile(new URL("../server.json", import.meta.url), "utf8"));
  const server = await readFile(new URL("../src/mcp/server.ts", import.meta.url), "utf8");
  const http = await readFile(new URL("../src/mcp/http.ts", import.meta.url), "utf8");
  assert.ok(metadata.description.length <= 100);
  assert.equal(metadata.remotes[0]?.url, "https://pa.l0g.fr/api/mcp");
  assert.match(server, /websiteUrl: "https:\/\/pa\.l0g\.fr\/agents\/"/);
  assert.match(server, /Conditions d'utilisation/);
  assert.match(server, /Confidentialité/);
  assert.match(server, /Sécurité/);
  assert.match(http, /responseMode: "auto"/);
  assert.match(http, /new Set\(\[MCP_PATH, `\$\{MCP_PATH\}\/`\]\)/);
});

test("le scanner force les flux navigateur à rester sur le proxy contrôlé", async () => {
  const scanner = await readFile(new URL("../scripts/observe-public-site-trackers.mjs", import.meta.url), "utf8");
  assert.match(scanner, /--disable-quic/);
  assert.match(scanner, /--disable-webrtc/);
  assert.match(scanner, /--force-webrtc-ip-handling-policy=disable_non_proxied_udp/);
});
