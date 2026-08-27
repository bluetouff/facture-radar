import { lookup as systemLookup } from "node:dns/promises";
import { createServer } from "node:http";
import { BlockList, connect as connectTcp, isIP } from "node:net";

const DNS_TIMEOUT_MS = 5_000;

const IPV4_DENYLIST = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
]) IPV4_DENYLIST.addSubnet(network, prefix, "ipv4");

const IPV6_GLOBAL = new BlockList();
IPV6_GLOBAL.addSubnet("2000::", 3, "ipv6");
const IPV6_DENYLIST = new BlockList();
for (const [network, prefix] of [
  ["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20],
]) IPV6_DENYLIST.addSubnet(network, prefix, "ipv6");

async function lookupAll(hostname) {
  return systemLookup(hostname, { all: true, verbatim: true });
}

function openTcpConnection(options) {
  return connectTcp(options);
}

export function isPublicIpAddress(address) {
  const family = isIP(address);
  if (family === 4) return !IPV4_DENYLIST.check(address, "ipv4");
  if (family === 6) {
    return IPV6_GLOBAL.check(address, "ipv6") && !IPV6_DENYLIST.check(address, "ipv6");
  }
  return false;
}

export function isForbiddenHostname(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (host === "localhost"
    || host.endsWith(".localhost")
    || host.endsWith(".local")
    || host.endsWith(".lan")
    || host.endsWith(".internal")
    || host.endsWith(".home.arpa")) return true;
  return isIP(host) !== 0 && !isPublicIpAddress(host);
}

export async function resolvePinnedPublicAddress(hostname, lookup = lookupAll) {
  if (isForbiddenHostname(hostname)) throw new Error("Destination locale ou réservée refusée");
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("Résolution DNS hors délai")), DNS_TIMEOUT_MS);
  });
  let answers;
  try {
    answers = await Promise.race([lookup(hostname), timeout]);
  } finally {
    clearTimeout(timer);
  }
  if (!Array.isArray(answers) || answers.length === 0) throw new Error("Aucune adresse résolue");
  if (answers.some((answer) => !isPublicIpAddress(answer.address))) {
    throw new Error("Résolution vers une adresse locale ou réservée refusée");
  }
  return answers.find((answer) => answer.family === 4) ?? answers[0];
}

function parseConnectTarget(authority) {
  if (typeof authority !== "string" || authority.length === 0 || authority.length > 255) return null;
  try {
    const url = new URL(`https://${authority}`);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    if (url.port && url.port !== "443") return null;
    return { hostname: url.hostname.replace(/^\[|\]$/g, ""), port: 443 };
  } catch {
    return null;
  }
}

function rejectTunnel(socket, status = "403 Forbidden") {
  if (!socket.destroyed) socket.end(`HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
}

export async function startPinnedHttpsProxy({
  lookup = lookupAll,
  connect = openTcpConnection,
  maxTunnels = 48,
  socketTimeoutMs = 15_000,
} = {}) {
  const sockets = new Set();
  let activeTunnels = 0;
  const server = createServer((_req, res) => {
    res.writeHead(403, { "content-length": "0", connection: "close" });
    res.end();
  });

  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("error", () => undefined);
    socket.once("close", () => sockets.delete(socket));
  });
  server.on("connect", async (request, clientSocket, head) => {
    const target = parseConnectTarget(request.url);
    if (!target || activeTunnels >= maxTunnels) {
      rejectTunnel(clientSocket, activeTunnels >= maxTunnels ? "429 Too Many Requests" : "403 Forbidden");
      return;
    }

    activeTunnels += 1;
    clientSocket.once("close", () => { activeTunnels -= 1; });
    clientSocket.setTimeout(socketTimeoutMs, () => clientSocket.destroy());

    try {
      const pinned = await resolvePinnedPublicAddress(target.hostname, lookup);
      let established = false;
      const upstream = connect({ host: pinned.address, family: pinned.family, port: target.port });
      sockets.add(upstream);
      upstream.once("close", () => sockets.delete(upstream));
      upstream.setTimeout(socketTimeoutMs, () => upstream.destroy());
      upstream.once("error", () => {
        if (!established) rejectTunnel(clientSocket, "502 Bad Gateway");
        else clientSocket.destroy();
      });
      upstream.once("connect", () => {
        established = true;
        clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        if (head.byteLength > 0) upstream.write(head);
        clientSocket.pipe(upstream);
        upstream.pipe(clientSocket);
      });
    } catch {
      rejectTunnel(clientSocket);
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Proxy local indisponible");

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: async () => {
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    },
  };
}
