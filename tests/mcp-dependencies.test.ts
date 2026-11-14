import assert from "node:assert/strict";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { createServer, request } from "node:http";
import { createRequire } from "node:module";
import test from "node:test";
import { getRequestListener } from "@hono/node-server";

const require = createRequire(import.meta.url);
const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8")) as {
  packages: Record<string, { version?: string }>;
};

test("le verrou et le SDK MCP chargé excluent les versions affectées d’octobre", () => {
  const servers = Object.entries(lock.packages).filter(([path]) => /(?:^|\/)node_modules\/@modelcontextprotocol\/server$/.test(path));
  assert.ok(servers.length > 0);
  const installed = JSON.parse(readFileSync(new URL("../node_modules/@modelcontextprotocol/server/package.json", import.meta.url), "utf8"));
  for (const version of [...servers.map(([, entry]) => entry.version), installed.version]) {
    assert.match(version, /^2\.\d+\.\d+$/);
    const [, minor, patch] = version.split(".").map(Number);
    assert.ok(minor > 3 || (minor === 3 && patch >= 1), `SDK MCP vulnérable ou antérieur au verrou retenu : ${version}`);
  }
});

test("Astro charge Vite 8.2.4 et toutes les copies suivent le correctif éditeur", () => {
  const copies = Object.entries(lock.packages).filter(([path]) => /(?:^|\/)node_modules\/vite$/.test(path));
  assert.ok(copies.length > 0);
  for (const [path, entry] of copies) assert.equal(entry.version, "8.2.4", path);
  const astroRequire = createRequire(require.resolve("astro/package.json"));
  assert.equal(astroRequire("vite/package.json").version, "8.2.4");
});

test("le transport MCP et son adaptateur HTTP excluent les versions vulnérables", () => {
  for (const [name, minimum] of [["@modelcontextprotocol/node", [2, 1, 2]], ["@hono/node-server", [2, 1, 8]], ["hono", [4, 13, 18]]] as const) {
    const copies = Object.entries(lock.packages).filter(([path]) => path.endsWith(`node_modules/${name}`));
    assert.ok(copies.length > 0, name);
    const installed = JSON.parse(readFileSync(new URL(`../node_modules/${name}/package.json`, import.meta.url), "utf8"));
    for (const [path, entry] of [...copies, [`loaded ${name}`, installed]] as [string, { version?: string }][]) {
      assert.match(entry.version!, /^\d+\.\d+\.\d+$/);
      const version = entry.version!.split(".").map(Number) as [number, number, number];
      assert.equal(version[0], minimum[0], path);
      assert.ok(version[1] > minimum[1] || (version[1] === minimum[1] && version[2] >= minimum[2]), path);
    }
  }
  assert.ok(!Object.keys(lock.packages).some(path => /node_modules\/(?:exceljs|minimatch|archiver)$/.test(path)));
});

test("l’adaptateur Hono refuse les antislashs bruts sans réécrire le chemin", async () => {
  // GHSA-jpvv-r467-5p4w: use a raw HTTP target; fetch would normalize it first.
  const server = createServer(getRequestListener((incoming) => {
    const url = new URL(incoming.url);
    return new Response(`${url.pathname}${url.search}`);
  }));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const send = (path: string) => new Promise<{ status: number | undefined; body: string }>((resolve, reject) => {
    const outgoing = request({ hostname: "127.0.0.1", port: address.port, path, agent: false }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => resolve({ status: response.statusCode, body }));
      response.on("error", reject);
    });
    outgoing.setTimeout(2_000, () => outgoing.destroy(new Error("Réponse HTTP hors délai")));
    outgoing.on("error", reject);
    outgoing.end();
  });
  try {
    for (const path of ["/admin\\secret", "/public\\..\\admin/secret", "http://localhost/admin\\secret"]) {
      assert.equal((await send(path)).status, 400, path);
    }
    for (const path of ["/admin/secret", "/admin%5Csecret", "/public?path=admin\\secret"]) {
      assert.deepEqual(await send(path), { status: 200, body: path }, path);
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
